import { sendToBasecamp } from './send.js';

const DEFAULT_THROTTLE_MS = 5000;
const DEFAULT_MAX_MESSAGES = 3;
const MIN_THROTTLE_MS = 1000;
/** Truncate progress previews to this many characters */
const MAX_PREVIEW_CHARS = 500;

export type BasecampProgressStream = {
  /** Queue the latest partial text; sends are throttled automatically */
  update: (text: string) => void;
  /** Stop the progress stream (no further messages will be sent) */
  stop: () => void;
};

export function createBasecampProgressStream(params: {
  callbackUrl: string;
  throttleMs?: number;
  maxMessages?: number;
  log?: (message: string) => void;
  warn?: (message: string) => void;
}): BasecampProgressStream {
  const throttleMs = Math.max(MIN_THROTTLE_MS, params.throttleMs ?? DEFAULT_THROTTLE_MS);
  const maxMessages = Math.max(1, params.maxMessages ?? DEFAULT_MAX_MESSAGES);
  const callbackUrl = params.callbackUrl;

  let pendingText = '';
  let lastSentAt = 0;
  let messagesSent = 0;
  let inFlight = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;

  const sendProgress = async (text: string) => {
    if (stopped || messagesSent >= maxMessages) {
      return;
    }
    const trimmed = text.trimEnd();
    if (!trimmed) {
      return;
    }
    // Truncate long previews and add ellipsis
    const preview = trimmed.length > MAX_PREVIEW_CHARS
      ? trimmed.slice(0, MAX_PREVIEW_CHARS) + '...'
      : trimmed;
    // Wrap in italic with a working indicator to distinguish from final response
    const formatted = `<em>\u270F\uFE0F Working...\n\n${preview}</em>`;
    messagesSent++;
    try {
      await sendToBasecamp(callbackUrl, formatted);
      params.log?.(`progress message ${messagesSent}/${maxMessages} sent`);
    } catch (err) {
      stopped = true;
      params.warn?.(
        `progress stream failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    if (messagesSent >= maxMessages) {
      params.log?.(`progress stream reached max messages (${maxMessages}), stopping`);
      stopped = true;
      if (timer) {
        clearTimeout(timer);
        timer = undefined;
      }
    }
  };

  const flush = async () => {
    if (timer) {
      clearTimeout(timer);
      timer = undefined;
    }
    if (stopped || inFlight) {
      // If in-flight, reschedule so the pending text isn't lost
      if (inFlight && pendingText && !stopped) {
        schedule();
      }
      return;
    }
    const text = pendingText;
    if (!text.trim()) {
      pendingText = '';
      return;
    }
    pendingText = '';
    inFlight = true;
    try {
      await sendProgress(text);
      lastSentAt = Date.now();
    } finally {
      inFlight = false;
    }
    // If new text arrived while we were sending, schedule another flush
    if (pendingText && !stopped) {
      schedule();
    }
  };

  const schedule = () => {
    if (timer || stopped) {
      return;
    }
    const delay = Math.max(0, throttleMs - (Date.now() - lastSentAt));
    timer = setTimeout(() => {
      timer = undefined;
      void flush();
    }, delay);
  };

  const update = (text: string) => {
    if (stopped) {
      return;
    }
    pendingText = text;
    if (inFlight) {
      schedule();
      return;
    }
    // Send immediately if enough time has passed
    if (!timer && Date.now() - lastSentAt >= throttleMs) {
      void flush();
      return;
    }
    schedule();
  };

  const stop = () => {
    stopped = true;
    pendingText = '';
    if (timer) {
      clearTimeout(timer);
      timer = undefined;
    }
  };

  params.log?.(
    `basecamp progress stream ready (throttleMs=${throttleMs}, maxMessages=${maxMessages})`,
  );

  return { update, stop };
}
