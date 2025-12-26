import * as React from 'react';

export const TestEmail = ({ name }: { name: string }) => {
    return (
        <div>
            <h1>Hello, {name}!</h1>
        </div>
    );
};

export default TestEmail;
