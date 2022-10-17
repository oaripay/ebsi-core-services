import axios from "axios";
import REQUIRED_VARIABLES from "../env";
import { session, messages } from "../types";

export const validateSession = async (
  sessionRequest: session.SessionRequest
): Promise<messages.ApiResponse> => {
  try {
    const response = await axios.post(
      `${REQUIRED_VARIABLES.REACT_APP_API_URL}/sessions`,
      sessionRequest
    );
    return {
      status: response.status,
      data: response.data as session.SessionResponse,
    };
  } catch (error) {
    const errorData = (error as Error).message;
    return { status: 500, data: errorData };
  }
};

export default validateSession;
