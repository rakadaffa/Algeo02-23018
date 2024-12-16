import Link from "next/link";
import Image from "next/image";
import AboutImage from "@/public/about.png";

const page = () => {
  return (
    <main>
      <div className="flex w-full min-h-screen flex-col">
        {/* Top Section */}
        <div className="bg-gradient-to-t from-black to-[#3b525a] px-10 md:px-20 py-7 min-h-screen">
          {/* Navbar */}
          <div className="flex justify-between items-center w-full">
            <Link
              href="/"
              className="font-semibold text-white text-sm md:text-base"
            >
              {" "}
              Spoti-find Lembang{" "}
            </Link>
            <Link
              href="/about"
              className="bg-[#a9fb50] rounded-full px-10 font-semibold py-3 hover:bg-[#7cbc39] cursor-pointer text-sm md:text-base"
            >
              {" "}
              About{" "}
            </Link>
          </div>
          <div className="flex flex-col items-center justify-center mt-10">
            <h1 className="font-light text-white"> The People Behind : </h1>
            <h1 className="font-bold bg-gradient-to-b from-white to-[#939598] inline-block text-transparent bg-clip-text text-5xl mt-2">
              {" "}
              Spoti-find Lembang
            </h1>
            <Image src={AboutImage} alt="Image" className="w-[800px] mt-2" />
          </div>
        </div>
      </div>
    </main>
  );
};

export default page;
