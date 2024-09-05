import BaseAPI from "../base-api";
import v1Client from "./v1";

class PtModelAPI extends BaseAPI {

    getPretrainedModels() {
        return v1Client().get("/pretrained_models");
    }
}

const ptModelAPI = new PtModelAPI();

export default ptModelAPI;
