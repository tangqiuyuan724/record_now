
import { Heading } from '../types';

/**
 * Generates a random alphanumeric ID.
 * Used for file IDs in local storage and block IDs in the editor.
 */
export const generateId = (): string => Math.random().toString(36).substr(2, 9);

/**
 * Converts a File object to a Base64 string.
 * Used for handling image drops/pastes.
 */
export const convertFileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Checks if a markdown line indicates a table structure.
 */
export const isTableLine = (line: string): boolean => line.trim().startsWith('|');

/**
 * Parses markdown content to extract headings for the Outline view.
 */
export const parseHeadings = (content: string): Heading[] => {
  const lines = content.split('\n');
  const headings: Heading[] = [];
  const regex = /^(#{1,6})\s+(.*)$/;

  lines.forEach((line, index) => {
    // Only match lines that are NOT inside code blocks is tricky without a full parser,
    // but a simple regex covers 95% of cases for a TOC.
    const match = line.match(regex);
    if (match) {
      headings.push({
        level: match[1].length,
        text: match[2].trim(),
        line: index
      });
    }
  });

  return headings;
};

/**
 * Simple debounce function implementation.
 */
export const debounce = <F extends (...args: any[]) => any>(func: F, waitFor: number) => {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<F>): void => {
    if (timeout !== null) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => func(...args), waitFor);
  };
};
