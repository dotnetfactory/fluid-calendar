"use client";

import React from "react";

import { useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

export default function OpenSourceHomePage() {
  const { data: session } = useSession();
  const router = useRouter();

  const handleLogin = () => {
    if (session) {
      router.push("/calendar");
    } else {
      router.push("/auth/signin");
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* GitHub Button in Top Right */}
      <div className="absolute right-4 top-4">
        <Link
          href="https://github.com/dotnetfactory/fluid-calendar"
          target="_blank"
        >
          <Button size="sm" className="bg-black text-white hover:bg-gray-800">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              fill="currentColor"
              viewBox="0 0 16 16"
              className="mr-2"
            >
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
            </svg>
            View on GitHub
          </Button>
        </Link>
      </div>

      {/* Main Content */}
      <main className="flex flex-grow flex-col items-center justify-center px-4 py-12">
        {/* Logo */}
        <div className="mb-8">
          <Image
            src="/logo.svg"
            alt="FluidCalendar Logo"
            width={64}
            height={64}
            className="h-16 w-16"
            priority
          />
        </div>

        {/* Title and Description */}
        <h1 className="mb-6 text-center text-5xl font-bold md:text-6xl">
          <span className="text-blue-600">FluidCalendar</span>
          <span className="text-gray-800"> Open Source</span>
        </h1>
        <p className="mx-auto mb-4 max-w-3xl text-center text-xl text-gray-600">
          The open-source intelligent calendar that adapts to your workflow.
          Experience seamless task scheduling powered by AI, designed to make
          your time management effortless.
        </p>
        <p className="mb-8 text-center text-lg text-gray-500">
          Your open-source alternative to Motion
        </p>

        {/* Login and GitHub Buttons */}
        <div className="mb-12 flex flex-col gap-4 sm:flex-row">
          <Button
            size="lg"
            className="bg-blue-600 px-8 py-6 text-lg hover:bg-blue-700"
            onClick={handleLogin}
          >
            {session ? "Go to App" : "Sign In"}
          </Button>
          <Link
            href="https://github.com/dotnetfactory/fluid-calendar"
            target="_blank"
          >
            <Button size="lg" variant="outline" className="px-8 py-6 text-lg">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                fill="currentColor"
                viewBox="0 0 16 16"
                className="mr-2"
              >
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
              </svg>
              View on GitHub
            </Button>
          </Link>
        </div>

        {/* Open Source Features */}
        <div className="w-full max-w-6xl">
          <h2 className="mb-8 text-center text-3xl font-bold">
            Open Source Features
          </h2>

          {/* Self-Hosting */}
          <div className="mb-8 flex rounded-lg bg-white p-8 shadow-sm">
            <div className="mr-6 text-blue-600">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-12 w-12"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
                />
              </svg>
            </div>
            <div>
              <h3 className="mb-2 text-xl font-semibold">Self-Hosting</h3>
              <p className="text-gray-600">
                Host FluidCalendar on your own servers for complete control over
                your data and infrastructure.
              </p>
            </div>
          </div>

          {/* Full Source Access */}
          <div className="mb-8 flex rounded-lg bg-white p-8 shadow-sm">
            <div className="mr-6 text-blue-600">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-12 w-12"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                />
              </svg>
            </div>
            <div>
              <h3 className="mb-2 text-xl font-semibold">Full Source Access</h3>
              <p className="text-gray-600">
                Access and modify the complete source code to customize
                FluidCalendar to your specific needs.
              </p>
            </div>
          </div>

          {/* Community Driven */}
          <div className="mb-8 flex rounded-lg bg-white p-8 shadow-sm">
            <div className="mr-6 text-blue-600">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-12 w-12"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <div>
              <h3 className="mb-2 text-xl font-semibold">Community Driven</h3>
              <p className="text-gray-600">
                Join a vibrant community of developers and users contributing to
                the future of FluidCalendar.
              </p>
            </div>
          </div>
        </div>

        {/* Get Started Section */}
        <div className="mt-12 w-full max-w-3xl rounded-lg border border-gray-200 bg-gray-50 p-8">
          <h2 className="mb-4 text-center text-2xl font-bold">
            Get Started with FluidCalendar
          </h2>
          <div className="mt-6 flex flex-col justify-center gap-4 sm:flex-row">
            <Button
              size="lg"
              className="bg-blue-600 px-8 py-4 hover:bg-blue-700"
              onClick={handleLogin}
            >
              {session ? "Go to Your Calendar" : "Sign In to Your Instance"}
            </Button>
            <Link
              href="https://github.com/dotnetfactory/fluid-calendar#installation"
              target="_blank"
            >
              <Button size="lg" variant="outline" className="px-8 py-4">
                Installation Guide
              </Button>
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center justify-between md:flex-row">
            <div className="mb-4 flex items-center space-x-2 md:mb-0">
              <Image
                src="/logo.svg"
                alt="FluidCalendar Logo"
                width={24}
                height={24}
                className="text-blue-600"
              />
              <span className="text-xl font-bold">FluidCalendar</span>
            </div>
            <div className="text-sm text-gray-500">
              Licensed under MIT. Contribute on{" "}
              <a
                href="https://github.com/dotnetfactory/fluid-calendar"
                className="text-blue-600 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
