import BaseAPI from "../base-api";
import v1Client from "./v1";

class TrainingAPI extends BaseAPI {

    uploadDatasetFile(file, clientId, datasetId, repeat) {
        const form = new FormData();
        form.append("client_id", clientId);
        form.append("dataset_id", datasetId);
        form.append("file", file);
        form.append("repeat", repeat);

        return v1Client().post("/sd_lora_training/dataset", form, {
            transformRequest: []
        });
    }

    createTask(clientId, datasetId, pretrainedModelName, taskConfig) {
        return v1Client().post("/sd_lora_training", {
            'client_id': clientId,
            'dataset_id': datasetId,
            'pretrained_model_name': pretrainedModelName,
            'config': taskConfig
        });
    }

    stopTask(taskId) {
        return v1Client().delete("/sd_lora_training/" + taskId);
    }

    getTaskStatus(taskId) {
        return v1Client().get("/sd_lora_training/" + taskId);
    }

    getTaskLog(taskId, lineNumber) {
        return v1Client().get("/sd_lora_training/" + taskId + "/logs?start_line=" + lineNumber);
    }

    downloadModel(taskId) {
        const url = v1Client().getBaseURL() + "/sd_lora_training/" + taskId + "/model";

        return fetch(url);
    }
}

const trainingAPI = new TrainingAPI();

export default trainingAPI;
