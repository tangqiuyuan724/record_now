
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
