import { FastifyMultipartAttactFieldsToBodyOptions } from "@fastify/multipart";

// https://www.fastify.io/docs/latest/Server
export const fastifyAdapterConfig = {
  // By default, maxParamLength=100 but we allow keys to be up to 256 bytes, thus we need to allow more chars
  // https://www.fastify.io/docs/latest/Server/#maxparamlength
  maxParamLength: 400,
  // By default, bodyLimit=1048576 (1MiB)
  // https://www.fastify.io/docs/latest/Server/#bodylimit
  // We increase the limit to 5MiB
  bodyLimit: 5 * 1024 * 1024,
};

// https://github.com/fastify/fastify-multipart
export const fastifyMultipartConfig: FastifyMultipartAttactFieldsToBodyOptions =
  {
    limits: {
      fieldNameSize: 100, // Max field name size in bytes
      fieldSize: 6 * 1024 * 1024, // Max field value size in bytes
      fields: 10, // Max number of non-file fields
      fileSize: 6 * 1024 * 1024, // For multipart forms, the max file size
      files: 1, // Max number of file fields
      headerPairs: 2000, // Max number of header key=>value pairs
    },
    attachFieldsToBody: true,
    throwFileSizeLimit: true,
  };
