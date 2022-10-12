import { MultipartFile, MultipartValue } from "@fastify/multipart";

export interface PostFileBody {
  file: MultipartFile;
  metadata: MultipartValue<string>;
}

export default PostFileBody;
