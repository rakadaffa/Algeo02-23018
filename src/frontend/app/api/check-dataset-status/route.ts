import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(req: Request) {
  try {
    const imageDataset = await prisma.datasetPicture.findFirst();
    const musicDataset = await prisma.datasetMidi.findFirst();
    const mapper = await prisma.mapper.findFirst();

    return new Response(
      JSON.stringify({
        imageDataset: imageDataset?.name || null,
        musicDataset: musicDataset?.name || null,
        mapperName: mapper?.name || null,
      }),
      { status: 200 }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: "Failed to fetch data" }), {
      status: 500,
    });
  }
}
