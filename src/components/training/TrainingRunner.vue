<script setup>
import {computed, ref} from 'vue'
import { useNodeStore } from '@/stores/node'
import ptModelAPI from '@/api/v1/pt-model'
import trainingAPI from '@/api/v1/training';
import Dataset from "@/models/dataset";
import { v4 as uuidV4 } from 'uuid';
import {useClientStore} from "@/stores/client";
import {useTaskStore} from "@/stores/task";
import LogConsole from "@/components/training/LogConsole.vue";
import { DownOutlined, UpOutlined } from "@ant-design/icons-vue";

const nodeStore = useNodeStore()
const clientStore = useClientStore()
const taskStore = useTaskStore()

const modalVisible = ref(false)
const isRunning = ref(false)
const baseModel = ref('')
const baseModelCandidates = ref([])
const hardware = ref('local')
const props = defineProps(['dataset', 'datasetDirHandle'])

let traceTaskRunningStatusInterval;
let currentLine = 0;

const showModal = async () => {
    modalVisible.value = true
    isRunning.value = false
    await updateTaskStatus();

    if (nodeStore.isNodeFilled) {
        baseModelCandidates.value = await ptModelAPI.getPretrainedModels()
    }
}

const hideModal = () => {
    modalVisible.value = false;

    if(traceTaskRunningStatusInterval) {
        clearInterval(traceTaskRunningStatusInterval);
        traceTaskRunningStatusInterval = null;
    }
}

const notReadyToRun = computed(() => {
    return !nodeStore.isNodeFilled || baseModel.value === '';
});

const baseModelSelectionDisabled = computed(() => {
    return !nodeStore.isNodeFilled || isRunning;
});

const run = async () => {
    isRunning.value = true;
    taskStore.training_task.model_downloaded = false;

    clearLog();

    // Prepare the dataset
    appendLog("Processing the dataset...");

    // Save the tags to txt file in the traditional format
    await Dataset.saveAllImageTagsToTraditionalTxtFiles(props.dataset, props.datasetDirHandle);

    // Generate a dataset id
    const datasetId = uuidV4();

    const clientId = clientStore.client_id;

    // Upload images and tag files
    for(let i=0, l=props.dataset.images.length; i<l; i++) {
        const imageEntry = props.dataset.images[i];
        const imageFile = await imageEntry.getFile();
        await trainingAPI.uploadDatasetFile(imageFile, clientId, datasetId, taskStore.training_task.config.repeat);

        const tagFileName = Dataset.imageNameToTraditionalTagFileName(imageEntry.name);
        try {
            const tagFileHandle = await props.datasetDirHandle.getFileHandle(tagFileName);
            const tagFile = await tagFileHandle.getFile();
            await trainingAPI.uploadDatasetFile(tagFile, clientId, datasetId, taskStore.training_task.config.repeat);
            appendLog("Processing image...(" + i + "/" + l + ")");
        } catch {
            console.log("txt file not exist");
        }
    }

    appendLog("Starting the remote training task...");
    // Start the training task
    const res = await trainingAPI.createTask(
        clientId,
        datasetId,
        baseModel.value,
        taskStore.training_task.config
    );

    appendLog("Remote task started: " + res.task_id);

    taskStore.training_task.task_id = res.task_id;
    taskStore.training_task.pretrained_model_name = baseModel.value;
    await updateTaskStatus();
}

const stop = async () => {

    if(!confirm("Are you sure to stop the current task?"))
        return;

    await trainingAPI.stopTask(taskStore.training_task.task_id);
    taskStore.clearTrainingTask();
    stopTracingTask();
    isRunning.value = false;
    appendLog("Task stopped!");
};

const taskResultStatus = ref("");

const updateTaskStatus = async () => {

    taskResultStatus.value = "";

    if(taskStore.training_task.task_id !== "") {
        isRunning.value = true;
        baseModel.value = taskStore.training_task.pretrained_model_name;
        await traceTaskRunningStatus();
    }
};

const traceTaskRunningStatus = async () => {

    if(traceTaskRunningStatusInterval) {
        clearInterval(traceTaskRunningStatusInterval);
    }

    currentLine = 0;

    const needTrace = await getTaskRunningStatus();

    if(needTrace) {
        traceTaskRunningStatusInterval = setInterval(getTaskRunningStatus, 5000);
    }
};

const getTaskRunningStatus = async () => {
    try {
            if(taskStore.training_task.task_id === null) {
                stopTracingTask();
                return false;
            }

            const taskStatus = await trainingAPI.getTaskStatus(taskStore.training_task.task_id);

            switch(taskStatus.status) {
                case 'PENDING':
                    // task unknown
                    // possibly deleted
                    isRunning.value = false;
                    taskStore.clearTrainingTask();
                    stopTracingTask();
                    return false;
                case 'SUCCESS':
                case 'FAILURE':
                case 'REVOKED':
                    taskResultStatus.value = taskStatus.status;
                    // stopped with logs
                    isRunning.value = false;
                    await updateTaskLogs();
                    stopTracingTask();

                    if(taskStatus.status === "SUCCESS") {
                        await downloadModel();
                    }

                    return false;
                case 'SENT':
                    // not started yet
                    isRunning.value = true;
                    appendLog("Task is waiting in the queue...");
                    return true;
                default:
                    // is running
                    isRunning.value = true;
                    await updateTaskLogs();
                    return true;
            }
        } catch (e) {
            console.log(e);
            return true;
        }
};

const stopTracingTask = () => {
    if(traceTaskRunningStatusInterval) {
        clearInterval(traceTaskRunningStatusInterval);
        traceTaskRunningStatusInterval = null;
    }
};

const updateTaskLogs = async () => {
    const logs = await trainingAPI.getTaskLog(taskStore.training_task.task_id, currentLine);

    logs.forEach((line) => {
        appendLog(line);
    });

    currentLine += logs.length;
};

const logs = ref("Ready to Roll Out!<br />");

const appendLog = (logText) => {
    logs.value = logs.value +logText.replace(/\n/g, "<br />");
    if(!/\n$|\r$|\n\r$|\r\n$/.test(logText)) {
        logs.value += "<br/>"
    }
};

const clearLog = () => {
    logs.value = "";
};

const downloadModel = async () => {
    if(taskStore.training_task.model_downloaded)
        return;

    const response = await trainingAPI.downloadModel(taskStore.training_task.task_id);
    const modelFileName = taskStore.training_task.task_id + ".safetensors";

    const modelFileHandle = await props.datasetDirHandle.getFileHandle(modelFileName, {create: true});
    const writer = await modelFileHandle.createWritable();

    await response.body.pipeTo(writer);

    taskStore.training_task.model_downloaded = true;
};

const advancedVisible = ref(false);
const toggleAdvancedVisible = () => {
    advancedVisible.value = !advancedVisible.value;
};
</script>

<template>
  <a-button type="danger" size="large" @click="showModal">Start Training</a-button>

  <a-modal
    :visible="modalVisible"
    title="Training"
    @ok="hideModal"
    @cancel="hideModal"
    width="800px"
    :mask-closable="false"
    :destroy-on-close="true"
  >
    <div class="running-node">
      <a-alert
        v-if="isRunning"
        :message="'Running on ' + nodeStore.node_info.node_name + ' (' + nodeStore.nodeUrl + ')'"
        type="success"
      />
      <a-alert
        v-if="!isRunning && nodeStore.isNodeFilled && nodeStore.isNodeTested"
        :message="
          'Will be running on ' + nodeStore.node_info.node_name + ' (' + nodeStore.nodeUrl + ')'
        "
        type="info"
      />
      <a-alert
        v-if="!isRunning && nodeStore.isNodeFilled && !nodeStore.isNodeTested"
        :message="'Will be running on ' + nodeStore.nodeUrl"
        type="info"
      />
      <a-alert
        v-if="!nodeStore.isNodeFilled"
        message="Please specify the Crynux node to use in settings."
        type="error"
      />
    </div>
    <log-console :logs="logs" :result-status="taskResultStatus"></log-console>
    <a-form-item label="Base model from marketplace" name="basemodel" style="margin-top: 16px">
      <a-select v-model:value="baseModel" :disabled="baseModelSelectionDisabled.value" style="width: 400px">
        <a-select-option :value="candidate" v-for="candidate in baseModelCandidates">{{
          candidate
        }}</a-select-option>
      </a-select>
    </a-form-item>
      <a-divider class="advanced-options-divider" @click="toggleAdvancedVisible">
          Advanced
          <down-outlined v-if="!advancedVisible"></down-outlined>
          <up-outlined v-else></up-outlined>
      </a-divider>
      <div v-if="advancedVisible">
          <a-form-item label="Image width" name="image-width" style="margin-top: 16px">
              <a-row :gutter="8">
                  <a-col :span="8">
                      <a-input v-model:value.number="taskStore.training_task.config.image_width" placeholder="Image width" />
                  </a-col>
              </a-row>
          </a-form-item>
          <a-form-item label="Image height" name="image-height">
              <a-row :gutter="8">
                  <a-col :span="8">
                      <a-input v-model:value.number="taskStore.training_task.config.image_height" placeholder="Image height" />
                  </a-col>
              </a-row>
          </a-form-item>
          <a-form-item label="Epoch" name="epoch">
              <a-row :gutter="8">
                  <a-col :span="8">
                      <a-input v-model:value.number="taskStore.training_task.config.epoch" placeholder="Epoch" />
                  </a-col>
              </a-row>
          </a-form-item>
          <a-form-item label="Batch size" name="batch-size">
              <a-row :gutter="8">
                  <a-col :span="8">
                      <a-input v-model:value.number="taskStore.training_task.config.batch_size" placeholder="Batch size" />
                  </a-col>
              </a-row>
          </a-form-item>
          <a-form-item label="Repeat" name="repeat">
              <a-row :gutter="8">
                  <a-col :span="8">
                      <a-input v-model:value.number="taskStore.training_task.config.repeat" placeholder="Repeat" />
                  </a-col>
              </a-row>
          </a-form-item>
          <a-form-item label="Network dimension" name="network-dimension">
              <a-row :gutter="8">
                  <a-col :span="8">
                      <a-input v-model:value.number="taskStore.training_task.config.network_dimension" placeholder="Network dimension" />
                  </a-col>
              </a-row>
          </a-form-item>
          <a-form-item label="Leanring rate" name="learning-rate">
              <a-row :gutter="8">
                  <a-col :span="8">
                      <a-input v-model:value="taskStore.training_task.config.learning_rate" placeholder="Leanring rate" />
                  </a-col>
              </a-row>
          </a-form-item>
          <a-form-item label="Optimizer" name="optimizer">
              <a-row :gutter="8">
                  <a-col :span="8">
                      <a-input v-model:value="taskStore.training_task.config.optimizer" placeholder="Optimizer" />
                  </a-col>
              </a-row>
          </a-form-item>
      </div>
    <template #footer>
        <a-button type="primary" danger v-if="isRunning" @click="stop">Stop</a-button>
      <a-button type="primary" @click="run" v-if="!isRunning" :disabled="notReadyToRun"
        >Start</a-button
      >
    </template>
  </a-modal>
</template>

<style scoped lang="stylus">
.advanced-options-divider
    color #cccccc
    cursor pointer
</style>
