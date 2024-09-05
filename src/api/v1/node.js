import BaseAPI from "../base-api";
import v1Client from "./v1";

class NodeAPI extends BaseAPI {
    async getNodeInfo() {
        return v1Client().get("/node");
    }
}

const nodeAPI = new NodeAPI();

export default nodeAPI;
