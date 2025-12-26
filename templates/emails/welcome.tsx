import { Tailwind } from "@react-email/tailwind";
import * as React from "react";

export const WelcomeEmail = ({ name, url }: { name: string; url: string }) => {
    return (
        <Tailwind
            config={{
                theme: {
                    extend: {
                        colors: {
                            brand: "#007291",
                        },
                    },
                },
            }}
        >
            <html>
                <head />
                <body className="bg-white font-sans">
                    <div className="p-8">
                        <h1 className="text-2xl font-bold text-gray-800">Welcome to Mailer!</h1>
                        <p className="mt-4 text-gray-600">
                            We're excited to have you on board, {name}!
                        </p>
                        <a
                            className="mt-6 inline-block bg-brand px-5 py-3 text-white rounded-md no-underline"
                            href={url}
                        >
                            Get Started
                        </a>
                    </div>
                </body>
            </html>
        </Tailwind>
    );
};

export default WelcomeEmail;
