import { createOpenAI } from "@ai-sdk/openai";
import { Output, streamText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayRunIdFetch } from "./ai/run-id.server";
import { handleBlockCategory, type HandleBlockCategory } from "./account-rules";
import { clampBox, MIN_BOX, type Box } from "./photo-blur";

export type DetectBoxResult =
  | { outcome: "ok"; box: Box | null }
  | { outcome: "unavailable"; block: HandleBlockCategory | null; runId?: string | undefined };

const fraction = z.number().min(0).max(1);
// Strict structured output requires every key in `required`; optional keys are
// rejected with invalid_json_schema. Nullable keys stay required but may be null.
const boxSchema = z
  .object({
    found: z.boolean(),
    x: fraction.nullable(),
    y: fraction.nullable(),
    w: fraction.nullable(),
    h: fraction.nullable(),
  })
  .strict();

/**
 * Ask the AI for one thing: the box around the license plate, as fractions of
 * the image, or "none". The image travels only in this request body; it is
 * never stored or logged. Anything unexpected becomes "no box".
 */
export async function detectPlateBoxInImage(dataUrl: string): Promise<DetectBoxResult> {
  // Server-only test switch, off by default; nothing in a request can turn it on.
  if (process.env["PHOTO_DETECT_FORCE_UNAVAILABLE"] === "1")
    return { outcome: "unavailable", block: null };
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) return { outcome: "unavailable", block: null };
  const run = createLovableAiGatewayRunIdFetch();
  let block: HandleBlockCategory | null = null;
  const provider = createOpenAI({
    apiKey: key,
    baseURL: "https://ai.gateway.lovable.dev/v1",
    headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: async (input, init) => {
      const response = await run.fetch(input, init);
      if (response.status === 402 || response.status === 403) {
        let type: string | undefined;
        try {
          const body = (await response.clone().json()) as {
            type?: string;
            error?: { type?: string; code?: string };
          };
          type = body.type ?? body.error?.type ?? body.error?.code;
        } catch {
          /* Preserve the upstream failure. */
        }
        block = handleBlockCategory(response.status, type);
        console.warn("Photo box detection gateway failure", {
          status: response.status,
          category: block,
          runId: run.getRunId(),
        });
      }
      return response;
    },
  });
  try {
    const result = streamText({
      model: provider.responses("openai/gpt-6-astra"),
      maxRetries: 0,
      instructions:
        "You are given a photo that contains a vehicle's license plate. Return the bounding box of the license plate only, as fractions of the image width and height (x and y are the top-left corner, w and h are the size, each between 0 and 1). If no license plate is visible, return found: false. Return nothing else; never describe the image, the vehicle, or any person.",
      messages: [
        {
          role: "user",
          content: [{ type: "image", image: dataUrl }],
        },
      ],
      output: Output.object({ schema: boxSchema }),
      providerOptions: {
        openai: {
          forceReasoning: true,
          reasoningEffort: "low",
          reasoningSummary: "auto",
          store: false,
          include: ["reasoning.encrypted_content"],
        },
      },
    });
    const output = await result.output;
    if (
      !output.found ||
      output.x === undefined ||
      output.y === undefined ||
      output.w === undefined ||
      output.h === undefined ||
      output.w < MIN_BOX ||
      output.h < MIN_BOX
    )
      return { outcome: "ok", box: null };
    return {
      outcome: "ok",
      box: clampBox({ x: output.x, y: output.y, w: output.w, h: output.h }),
    };
  } catch {
    return { outcome: "unavailable", block, runId: run.getRunId() };
  }
}
