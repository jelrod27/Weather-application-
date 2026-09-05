#!/usr/bin/env node

/**
 * Script to add Fair Source License headers to all source files
 * Run with: node add-license-headers.js
 */

const fs = require('fs');
const path = require('path');

const LICENSE_HEADER = `/**
 * 16-Bit Weather Platform - BETA v0.3.2
 * 
 * Copyright (C) 2025 16-Bit Weather
 * Licensed under Fair Source License, Version 0.9
 * 
 * Use Limitation: 5 users
 * See LICENSE file for full terms
 * 
 * BETA SOFTWARE NOTICE:
 * This software is in active development. Features may change.
 * Report issues: https://github.com/jelrod27/Weather-application-/issues
 */

`;

// Directories to process
const DIRECTORIES = [
  'app',
  'components',
  'lib'
];

// File extensions to process
const EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];

// Files to skip
const SKIP_FILES = [
  'node_modules',
  '.next',
  'dist',
  'build',
  'coverage'
];

function shouldSkip(filePath) {
  return SKIP_FILES.some(skip => filePath.includes(skip));
}

function hasLicenseHeader(content) {
  return content.includes('Fair Source License') || 
         content.includes('16-Bit Weather Platform');
}

function addHeaderToFile(filePath) {
  if (shouldSkip(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  
  // Skip if already has license header
  if (hasLicenseHeader(content)) {
    console.log(`✓ Already has header: ${filePath}`);
    return;
  }

  // Handle different file types
  let newContent;
  
  // For files that start with "use client" or "use server"
  if (content.startsWith('"use client"') || content.startsWith('"use server"')) {
    const lines = content.split('\n');
    const directive = lines[0];
    const rest = lines.slice(1).join('\n');
    newContent = `${directive}\n\n${LICENSE_HEADER}${rest}`;
  } else {
    newContent = LICENSE_HEADER + content;
  }

  fs.writeFileSync(filePath, newContent, 'utf8');
  console.log(`✅ Added header to: ${filePath}`);
}

function processDirectory(dirPath) {
  const files = fs.readdirSync(dirPath);

  files.forEach(file => {
    const filePath = path.join(dirPath, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory() && !shouldSkip(filePath)) {
      processDirectory(filePath);
    } else if (stat.isFile()) {
      const ext = path.extname(file);
      if (EXTENSIONS.includes(ext)) {
        addHeaderToFile(filePath);
      }
    }
  });
}

console.log('🚀 Adding Fair Source License headers to source files...\n');

DIRECTORIES.forEach(dir => {
  const dirPath = path.join(process.cwd(), dir);
  if (fs.existsSync(dirPath)) {
    console.log(`\n📁 Processing ${dir}/...`);
    processDirectory(dirPath);
  }
});

console.log('\n✨ Done! License headers have been added to all source files.');
console.log('\nNote: Remember to update [your-username] in the headers with your actual GitHub username.');
