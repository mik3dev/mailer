import * as grpc from "@grpc/grpc-js";
import { sendEmailUseCase } from "../lib/services/email.service";

export const sendHandler = async (call: any, callback: any) => {
    const { to, template, subject, props_json, client_id, trace_id } = call.request;

    // Basic validation
    if (!to || !template) {
        return callback({
            code: grpc.status.INVALID_ARGUMENT,
            details: "Missing required fields: to, template"
        });
    }

    if (!client_id) {
        return callback({
            code: grpc.status.UNAUTHENTICATED,
            details: "Missing client_id"
        });
    }

    try {
        let props = {};
        if (props_json) {
            try {
                props = JSON.parse(props_json);
            } catch (e) {
                return callback({
                    code: grpc.status.INVALID_ARGUMENT,
                    details: "Invalid props_json format"
                });
            }
        }

        const result = await sendEmailUseCase({
            to,
            template,
            subject,
            props
        }, {
            clientId: client_id,
            traceId: trace_id
        });

        callback(null, {
            message_id: result.messageId,
            status: result.status
        });

    } catch (err: any) {
        console.error("[gRPC] Send failed:", err);
        callback({
            code: grpc.status.INTERNAL,
            details: "Internal Server Error"
        });
    }
};
