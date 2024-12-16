import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { type, name } = await req.json();

    if (type === "image") {
      await prisma.datasetPicture.create({ data: { name } });
    } else if (type === "music") {
      await prisma.datasetMidi.create({ data: { name } });
    } else if (type === "mapper") {
      await prisma.mapper.create({ data: { name } });
    }

    return new Response(JSON.stringify({ message: "Saved successfully." }), {
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Failed to save data" }), {
      status: 500,
    });
  }
}
