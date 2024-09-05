import BaseAPI from "../base-api";
import v1Client from "./v1";

class InferenceAPI extends BaseAPI {
    getModel(modelId) {
        return v1Client().get("/sd_lora_inference/models/" + modelId);
    }

    createTask(modelId, ptModelName, prompts, negativePrompts, pose, taskConfig) {
        return v1Client().post("/sd_lora_inference/models/" + modelId + "/inference_tasks", {
            'model_id': modelId,
            'pretrained_model_name': ptModelName,
            'prompts': prompts,
            'negative_prompts': negativePrompts,
            'pose': pose,
            'config': taskConfig
        });
    }

    stopTask(taskId) {
        return v1Client().delete("/sd_lora_inference/models/inference_tasks/" + taskId);
    }

    getTaskStatus(taskId) {
        return v1Client().get("/sd_lora_inference/models/inference_tasks/" + taskId);
    }

    getTaskLog(taskId, lineNumber) {
        return v1Client().get("/sd_lora_inference/models/inference_tasks/" + taskId + "/logs?start_line=" + lineNumber);
    }

    getImage(taskId, imageNum) {
        return v1Client().get("/sd_lora_inference/models/inference_tasks/" + taskId + "/images/" + imageNum);
    }

    uploadModel(modelFile, clientId) {
        const form = new FormData();
        form.append("client_id", clientId);
        form.append("file", modelFile);

        return v1Client().post("/sd_lora_inference/models", form, {
            transformRequest: []
        });
    }

    async getPoseImageAsDataURL(imageUrl) {
        const res = await fetch(imageUrl);
        const dataBlob = await res.blob();
        return this.readBlob(dataBlob);
    }

    readBlob(b) {
        return new Promise(function(resolve, reject) {
            const reader = new FileReader();
            reader.onloadend = function() {
                resolve(reader.result);
            };
            reader.onerror = reject;
            reader.readAsDataURL(b);
        });
    }
}

const inferenceAPI = new InferenceAPI();

export default inferenceAPI;
