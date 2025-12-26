import * as React from 'react';

export const TestEmail = ({ name }: { name: string }) => {
    return (
        <html>
            <head />
            <body>
                <div>
                    <h1>Hello, {name}!</h1>
                    <p>This is a test email.</p>
                </div>
            </body>
        </html>
    );
};

export default TestEmail;
