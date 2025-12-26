import { Tailwind } from "@react-email/tailwind";
import { Button } from "@react-email/components";
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
            <div className="bg-white p-8 font-sans">
                <h1 className="text-2xl font-bold text-gray-800">Welcome to Mailer!</h1>
                <p className="mt-4 text-gray-600">
                    We're excited to have you on board, {name}!
                </p>
                <Button
                    className="mt-6 bg-brand px-5 py-3 text-white rounded-md"
                    href={url}
                >
                    Get Started
                </Button>
            </div>
        </Tailwind>
    );
};

export default WelcomeEmail;
