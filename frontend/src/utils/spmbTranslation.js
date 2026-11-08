import sanitizeHtml from 'sanitize-html';
import { isRichText, richTextToPlain, sanitizeRichText } from './richText';

// Translate existing dictionary entries inside admin HTML without changing links or formatting.
export function translateSpmbContent(value, t) {
  if (!isRichText(value)) return t(value);
  return sanitizeHtml(sanitizeRichText(value), {
    allowedTags: sanitizeHtml.defaults.allowedTags, allowedAttributes: false,
    textFilter: text => text.replace(/\S[\s\S]*\S|\S/, part => t(richTextToPlain(`<p>${part}</p>`)).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')),
  });
}
