import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function DELETE(req: Request) {
  try {
    const { type } = await req.json();

    if (type === "image") {
      await prisma.datasetPicture.deleteMany();
    } else if (type === "music") {
      await prisma.datasetMidi.deleteMany();
    } else if (type === "mapper") {
      await prisma.mapper.deleteMany();
    }

    return new Response(JSON.stringify({ message: "Deleted successfully." }), {
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Failed to delete data" }), {
      status: 500,
    });
  }
}
