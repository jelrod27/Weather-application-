#!/usr/bin/env python3
"""macOS offline runner. Memory is monitored, not an OS cap.

Provision a bounded scratch volume separately; pass its mount point via
--scratch. Dependencies must already exist locally. No environment is inherited.
Subprocess creation, network/IPC, host home reads and source writes are denied.
Only stdout/stderr pipes are retained; scratch output is not promoted as evidence.
"""
import argparse
import fcntl
import json
import os
from pathlib import Path
import resource
import selectors
import shutil
import signal
import subprocess
import sys
import time


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--deps', type=Path, required=True)
    parser.add_argument('--scratch', type=Path, required=True)
    parser.add_argument('--self-test', action='store_true')
    parser.add_argument('--seconds', type=int, default=60)
    parser.add_argument('--memory-mib', type=int, default=512)
    parser.add_argument('command', nargs=argparse.REMAINDER)
    args = parser.parse_args()
    repo = Path(__file__).resolve().parents[2]
    scratch = args.scratch.resolve()
    deps = args.deps.resolve()
    node = Path(shutil.which('node')).resolve()
    # Fail closed: ordinary host directories are not bounded scratch volumes.
    disk = shutil.disk_usage(scratch)
    if not os.path.ismount(scratch) or disk.total > 80 * 1024 * 1024:
        parser.error('--scratch must be a dedicated mounted volume of at most 80 MiB')
    if deps.name != 'node_modules' or not (deps / 'jest/bin/jest.js').is_file():
        parser.error('--deps must contain an existing Jest installation')
    # One owner per volume. Reset only this runner's disposable directories,
    # after locking and before any target process exists. Never follow a
    # symlink or remove source/user files.
    lock = os.open(scratch.parent / 'runner.lock', os.O_CREAT | os.O_RDWR, 0o600)
    try:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        parser.error('scratch volume is already in use')
    disposable_directories = [scratch / name for name in ['home', 'tmp', 'cache']]
    for directory in disposable_directories:
        if directory.is_symlink():
            parser.error(f'scratch {directory.name} must not be a symlink')
    for directory in disposable_directories:
        if directory.exists():
            shutil.rmtree(directory)
        directory.mkdir()
    quote = json.dumps
    reads = [repo, deps, node.parent, scratch, Path('/System'), Path('/usr'), Path('/bin'), Path('/sbin')]
    profile = '\n'.join([
        '(version 1)', '(deny default)',
        '(deny process-fork)',
        '(allow process-exec (literal ' + quote(str(node)) + '))',
        '(allow sysctl-read)', '(allow file-read-metadata)',
        '(allow file-read-data (literal "/"))',
        *['(allow file-read* (subpath ' + quote(str(p)) + '))' for p in reads],
        '(allow file-read* (literal "/dev/null") (literal "/dev/urandom") (literal "/dev/random"))',
        '(allow file-write* (subpath ' + quote(str(scratch)) + ') (literal "/dev/null"))',
        '(deny file-read* (subpath ' + quote(str(repo / '.git')) + ') (subpath ' + quote(str(repo / '.superpowers')) + '))',
        '(deny file-read* (regex #"/\\.env([^/]*)(/|$)"))',
    ])
    env = {
        'PATH': str(node.parent) + ':/usr/bin:/bin',
        'HOME': str(scratch / 'home'), 'TMPDIR': str(scratch / 'tmp'),
        'XDG_CACHE_HOME': str(scratch / 'cache'), 'NODE_ENV': 'test',
        'CI': '1', 'TZ': 'UTC', 'NEXT_TELEMETRY_DISABLED': '1',
        'RAYON_NUM_THREADS': '1', 'UV_THREADPOOL_SIZE': '1',
        'DEBUG_PRINT_LIMIT': '600',
    }
    if args.self_test:
        # All probes are trusted runner code and use dummy paths/data only.
        program = r'''
const fs = require('fs'), net = require('net'), cp = require('child_process');
const assert = require('assert');
assert.deepStrictEqual(Object.keys(process.env).sort(), JSON.parse(process.argv[1]).sort());
for (const directory of [process.env.HOME, process.env.TMPDIR, process.env.XDG_CACHE_HOME]) {
  assert.deepStrictEqual(fs.readdirSync(directory), [], 'disposable directories must start empty');
}
for (const op of [
  () => fs.readFileSync(process.argv[2]),
  () => fs.writeFileSync(process.argv[3], 'must not write'),
  () => fs.readFileSync(process.argv[4]),
  () => fs.readFileSync(process.argv[5]),
]) assert.throws(op, e => e.code === 'EPERM' || e.code === 'EACCES');
const child = cp.spawnSync(process.execPath, ['-e', 'process.exit(0)']);
assert(child.error, 'subprocess creation must be denied');
fs.writeFileSync(process.env.TMPDIR + '/allowed.txt', 'dummy');
const socket = net.connect({host:'192.0.2.1',port:9});
socket.on('connect', () => { throw new Error('network unexpectedly allowed'); });
socket.on('error', e => { assert(['EPERM','EACCES'].includes(e.code)); console.log('PASS: empty environment, private files denied, source read-only, scratch writable, subprocess/network denied'); });
'''
        private = scratch.parent / 'private-canary.txt'
        private.write_text('nonsecret isolation canary')
        env_canary = scratch / '.env.canary'
        env_canary.write_text('DUMMY_ONLY=not-a-secret')
        command = ['-e', program, json.dumps(list(env)), str(private), str(repo / 'sandbox-write-canary.txt'), str(repo / '.git'), str(env_canary)]
    else:
        command = args.command[1:] if args.command[:1] == ['--'] else args.command
        if not command:
            parser.error('supply a Node entrypoint after --')
        if Path(command[0]).resolve() == deps / 'jest/bin/jest.js':
            command += ['--config', str(repo / 'scripts/security/jest.config.mjs'), '--runInBand']

    existing = subprocess.run(['/bin/ps', '-u', str(os.getuid()), '-o', 'pid='], capture_output=True, text=True, check=True)
    process_limit = len(existing.stdout.splitlines()) + 8

    def limits():
        resource.setrlimit(resource.RLIMIT_CPU, (args.seconds, args.seconds))
        resource.setrlimit(resource.RLIMIT_FSIZE, (16 * 1024 * 1024,) * 2)
        resource.setrlimit(resource.RLIMIT_NOFILE, (256, 256))
        resource.setrlimit(resource.RLIMIT_CORE, (0, 0))
        resource.setrlimit(resource.RLIMIT_NPROC, (process_limit, process_limit))

    process = subprocess.Popen(
        ['/usr/bin/sandbox-exec', '-p', profile, str(node), f'--max-old-space-size={min(1024, args.memory_mib * 2 // 3)}', *command],
        cwd=repo, env=env, stdin=subprocess.DEVNULL, stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT, start_new_session=True, preexec_fn=limits,
    )
    output = bytearray()
    selector = selectors.DefaultSelector()
    selector.register(process.stdout, selectors.EVENT_READ)
    deadline = time.monotonic() + args.seconds
    violation = None
    # Pipe closure is independent of process lifetime. Fork is OS-denied, so
    # monitoring this PID also covers all permitted target execution.
    try:
        while process.poll() is None or selector.get_map():
            for key, _ in selector.select(timeout=0.05):
                chunk = os.read(key.fd, 8192)
                if chunk:
                    output.extend(chunk)
                else:
                    selector.unregister(key.fileobj)
            rss = subprocess.run(['/bin/ps', '-o', 'rss=', '-p', str(process.pid)], capture_output=True, text=True, timeout=2)
            used = int(rss.stdout.strip() or '0')
            if used > args.memory_mib * 1024:
                violation = 'monitored RSS limit exceeded'
            if time.monotonic() > deadline:
                violation = 'wall time limit exceeded'
            if len(output) > 128 * 1024:
                violation = 'output limit exceeded'
            if violation:
                break
    finally:
        # Also executes on ps failures, closed output, interrupts and errors.
        try:
            if process.poll() is None:
                process.kill()
        except ProcessLookupError:
            pass
        code = process.wait(timeout=3)
        selector.close()
        process.stdout.close()
    sys.stdout.write(output[:128 * 1024].decode('utf-8', errors='replace'))
    print(f'\nRunner: exit={code}; memory=monitored {args.memory_mib} MiB; scratch=bounded 64 MiB; network/subprocesses denied')
    if violation:
        print(violation, file=sys.stderr)
        return 124
    return code if code >= 0 else 128 - code


if __name__ == '__main__':
    sys.exit(main())
