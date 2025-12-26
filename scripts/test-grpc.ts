import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import { join } from "path";

const PROTO_PATH = join(process.cwd(), "src/grpc/protos/mailer.proto");

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
});

const protoDescriptor = grpc.loadPackageDefinition(packageDefinition) as any;
const client = new protoDescriptor.mailer.MailerService(
    "localhost:50051",
    grpc.credentials.createInsecure()
);

const payload = {
    to: "test-grpc@example.com",
    template: "welcome",
    subject: "Hello from gRPC",
    client_id: "edacd37c-2665-4d73-a5cf-4a71155f1d4e", // Valid UUID from DB
    trace_id: "trace-grpc-123",
    props_json: JSON.stringify({ name: "Tester" })
};

console.log("Sending gRPC request...", payload);

client.Send(payload, (err: any, response: any) => {
    if (err) {
        console.error("gRPC Error:", err);
        process.exit(1);
    }
    console.log("gRPC Response:", response);
    process.exit(0);
});
