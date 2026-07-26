import "server-only";

const BREVO_EMAIL_ENDPOINT = "https://api.brevo.com/v3/smtp/email";

export class EmailProviderError extends Error {
  constructor(
    public readonly code: string,
    public readonly retryable: boolean,
  ) {
    super(code);
  }
}

export async function sendBrevoEmail(input: {
  recipient: string;
  subject: string;
  htmlContent: string;
  textContent: string;
  tag: string;
}) {
  const apiKey = required("BREVO_API_KEY");
  const senderEmail = required("ORDER_EMAIL_FROM");
  const senderName = process.env.ORDER_EMAIL_FROM_NAME?.trim() || "FoodApp";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const response = await fetch(BREVO_EMAIL_ENDPOINT, {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: { email: senderEmail, name: senderName },
        to: [{ email: input.recipient }],
        subject: input.subject,
        htmlContent: input.htmlContent,
        textContent: input.textContent,
        tags: [input.tag],
      }),
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new EmailProviderError(
        `brevo_http_${response.status}`,
        response.status === 408 ||
          response.status === 429 ||
          response.status >= 500,
      );
    }
    const body = (await response.json()) as { messageId?: unknown };
    if (typeof body.messageId !== "string" || body.messageId.length > 255) {
      throw new EmailProviderError("brevo_invalid_response", true);
    }
    return { messageId: body.messageId };
  } catch (error) {
    if (error instanceof EmailProviderError) throw error;
    throw new EmailProviderError(
      error instanceof Error && error.name === "AbortError"
        ? "brevo_timeout"
        : "brevo_network_error",
      true,
    );
  } finally {
    clearTimeout(timeout);
  }
}

function required(name: "BREVO_API_KEY" | "ORDER_EMAIL_FROM") {
  const value = process.env[name]?.trim();
  if (!value) throw new EmailProviderError(`${name.toLowerCase()}_missing`, false);
  return value;
}
