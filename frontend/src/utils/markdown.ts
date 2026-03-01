export const truncateMarkdown = (markdown: string, maxLength: number = 100): string => {
  if (!markdown) return '';

  let plainText = markdown;

  plainText = plainText.replace(/^#{1,6}\s+/gm, '');
  plainText = plainText.replace(/\*\*([^*]+)\*\*/g, '$1');
  plainText = plainText.replace(/__([^_]+)__/g, '$1');
  plainText = plainText.replace(/\*([^*]+)\*/g, '$1');
  plainText = plainText.replace(/_([^_]+)_/g, '$1');
  plainText = plainText.replace(/~~([^~]+)~~/g, '$1');
  plainText = plainText.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  plainText = plainText.replace(/`([^`]+)`/g, '$1');
  plainText = plainText.replace(/```[\s\S]*?```/g, '');
  plainText = plainText.replace(/^\s*[-*+]\s+/gm, '');
  plainText = plainText.replace(/^\s*\d+\.\s+/gm, '');
  plainText = plainText.replace(/^\s*>\s+/gm, '');
  plainText = plainText.replace(/^[-*_]{3,}\s*$/gm, '');
  plainText = plainText.replace(/\n\s*\n/g, '\n');
  plainText = plainText.trim();

  if (plainText.length <= maxLength) {
    return plainText;
  }

  return plainText.slice(0, maxLength) + '...';
};
