"use server";

import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getProgramOrThrow } from "@/lib/api/programs/get-program-or-throw";
import { PartnerStackApi } from "@/lib/partnerstack/api";
import { partnerStackImporter } from "@/lib/partnerstack/importer";
import { z } from "zod";
import { authActionClient } from "../safe-action";

const schema = z.object({
  workspaceId: z.string(),
  publicKey: z.string().min(1),
  secretKey: z.string().min(1),
});

export const startPartnerStackImportAction = authActionClient
  .schema(schema)
  .action(async ({ ctx, parsedInput }) => {
    const { workspace, user } = ctx;
    const { publicKey, secretKey } = parsedInput;

    const programId = getDefaultProgramIdOrThrow(workspace);

    const program = await getProgramOrThrow({
      workspaceId: workspace.id,
      programId,
    });

    if (!program.domain) {
      throw new Error("Program domain is not set.");
    }

    if (!program.url) {
      throw new Error("Program URL is not set.");
    }

    const partnerStackApi = new PartnerStackApi({
      publicKey,
      secretKey,
    });

    await partnerStackApi.testConnection();

    await partnerStackImporter.setCredentials(workspace.id, {
      publicKey,
      secretKey,
    });

    await partnerStackImporter.queue({
      programId,
      userId: user.id,
      action: "import-partners",
    });
  });
