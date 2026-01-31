import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { formatRelativeTime, formatFullDate } from './dateFormatter';

describe('dateFormatter', () => {
    describe('formatRelativeTime', () => {
        beforeEach(() => {
            // Mock Date.now() to return a consistent time for testing
            vi.useFakeTimers();
            vi.setSystemTime(new Date('2024-06-15T12:00:00.000Z'));
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it('should return "Just now" for times less than 60 seconds ago', () => {
            const date = new Date('2024-06-15T11:59:30.000Z').toISOString();
            expect(formatRelativeTime(date)).toBe('Just now');
        });

        it('should return "1 minute ago" for exactly 1 minute', () => {
            const date = new Date('2024-06-15T11:59:00.000Z').toISOString();
            expect(formatRelativeTime(date)).toBe('1 minute ago');
        });

        it('should return "X minutes ago" for less than 1 hour', () => {
            const date = new Date('2024-06-15T11:30:00.000Z').toISOString();
            expect(formatRelativeTime(date)).toBe('30 minutes ago');
        });

        it('should return "1 hour ago" for exactly 1 hour', () => {
            const date = new Date('2024-06-15T11:00:00.000Z').toISOString();
            expect(formatRelativeTime(date)).toBe('1 hour ago');
        });

        it('should return "X hours ago" for less than 1 day', () => {
            const date = new Date('2024-06-15T06:00:00.000Z').toISOString();
            expect(formatRelativeTime(date)).toBe('6 hours ago');
        });

        it('should return "1 day ago" for exactly 1 day', () => {
            const date = new Date('2024-06-14T12:00:00.000Z').toISOString();
            expect(formatRelativeTime(date)).toBe('1 day ago');
        });

        it('should return "X days ago" for less than 1 week', () => {
            const date = new Date('2024-06-12T12:00:00.000Z').toISOString();
            expect(formatRelativeTime(date)).toBe('3 days ago');
        });

        it('should return "1 week ago" for exactly 1 week', () => {
            const date = new Date('2024-06-08T12:00:00.000Z').toISOString();
            expect(formatRelativeTime(date)).toBe('1 week ago');
        });

        it('should return "X weeks ago" for less than 1 month', () => {
            const date = new Date('2024-06-01T12:00:00.000Z').toISOString();
            expect(formatRelativeTime(date)).toBe('2 weeks ago');
        });

        it('should return "1 month ago" for exactly 1 month', () => {
            const date = new Date('2024-05-15T12:00:00.000Z').toISOString();
            expect(formatRelativeTime(date)).toBe('1 month ago');
        });

        it('should return "X months ago" for less than 1 year', () => {
            const date = new Date('2024-03-15T12:00:00.000Z').toISOString();
            expect(formatRelativeTime(date)).toBe('3 months ago');
        });

        it('should return "1 year ago" for exactly 1 year', () => {
            const date = new Date('2023-06-15T12:00:00.000Z').toISOString();
            expect(formatRelativeTime(date)).toBe('1 year ago');
        });

        it('should return "X years ago" for multiple years', () => {
            const date = new Date('2022-06-15T12:00:00.000Z').toISOString();
            expect(formatRelativeTime(date)).toBe('2 years ago');
        });
    });

    describe('formatFullDate', () => {
        it('should format date with full month name', () => {
            const date = new Date('2024-06-15T14:30:00.000Z').toISOString();
            const formatted = formatFullDate(date);

            // Should contain the month name and day
            expect(formatted).toContain('June');
            expect(formatted).toContain('15');
            expect(formatted).toContain('2024');
        });

        it('should include time in the format', () => {
            const date = new Date('2024-01-01T09:05:00.000Z').toISOString();
            const formatted = formatFullDate(date);

            // Should contain year
            expect(formatted).toContain('2024');
            expect(formatted).toContain('January');
        });

        it('should handle different months', () => {
            expect(formatFullDate('2024-12-25T00:00:00.000Z')).toContain('December');
            expect(formatFullDate('2024-01-01T00:00:00.000Z')).toContain('January');
        });
    });
});
