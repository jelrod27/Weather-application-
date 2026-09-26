import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import StargazerNav from '@/components/stargazer/StargazerNav';
import type { StargazerTabId } from '@/components/stargazer/StargazerNav';
function Navigation(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<StargazerTabId>('start');
  return <StargazerNav activeTab={activeTab} onTabChange={setActiveTab} />;
}
it('supports arrow and Home/End keys with one tab stop and matching selected state', () => {
  render(<Navigation />);
  const start = screen.getByRole('tab', { name: /Start here/i });
  start.focus();
  fireEvent.keyDown(start, { key: 'ArrowRight' });
  const conditions = screen.getByRole('tab', { name: /Conditions/i });
  expect(conditions).toHaveFocus();
  expect(conditions).toHaveAttribute('aria-selected', 'true');
  expect(start).toHaveAttribute('tabindex', '-1');
  fireEvent.keyDown(conditions, { key: 'End' });
  expect(screen.getByRole('tab', { name: /Launches/i })).toHaveFocus();
  fireEvent.keyDown(document.activeElement!, { key: 'Home' });
  expect(start).toHaveFocus();
});
