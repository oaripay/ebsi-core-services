import { Multipart } from "fastify-multipart";

export interface PostFileBody {
  file: Multipart;
  metadata: Multipart<string>;
}

export default PostFileBody;
