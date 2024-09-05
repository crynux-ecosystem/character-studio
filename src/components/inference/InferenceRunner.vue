<script setup>
import {CodeOutlined, DownOutlined, UpOutlined} from "@ant-design/icons-vue";
import {computed, onBeforeUnmount, onMounted, ref} from "vue";
import ptModelAPI from "@/api/v1/pt-model";
import {useNodeStore} from "@/stores/node";
import LogConsole from "@/components/training/LogConsole.vue";
import inferenceAPI from "@/api/v1/inference";
import {useTaskStore} from "@/stores/task";
import config from '@/config.json';

const props = defineProps(["tags", "pose", "extraPrompts", "imageUri"]);
const emit = defineEmits(["image", "taskStarted"]);
const nodeStore = useNodeStore();
const taskStore = useTaskStore();
const modalVisible = ref(false);
const isRunning = ref(false);
const baseModelCandidates = ref([]);
const baseModel = ref('');
const taskResultStatus = ref("");
const logs = ref("Ready to Roll Out!<br/>");

let traceTaskRunningStatusInterval = null;

const extractedTags = computed(() => {
    let tags = [];
    Object.keys(props.tags).forEach((category) => {
        tags = tags.concat(props.tags[category]);
    });
    return tags;
});

const showModal = async () => {
    modalVisible.value = true

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

const run = async () => {
    isRunning.value = true;
    clearLog();

    let prompts = extractedTags.value.join(',');

    if(config.prompts.positive && config.prompts.positive !== "") {
        prompts = prompts + "," + config.prompts.positive;
    }

    if(props.extraPrompts !== "") {
        prompts += "," + props.extraPrompts;
    }

    let pose = "";

    if(props.pose.category !== "" && props.pose.index !== "") {
        const poseImageUrl = "/poses/" + props.pose.category + "/"
            + props.pose.category + "_" + String(props.pose.index).padStart(2, '0') + '.png';

        pose = await inferenceAPI.getPoseImageAsDataURL(poseImageUrl);
    }

    const res = await inferenceAPI.createTask(
        taskStore.inference_task.model_id,
        baseModel.value,
        prompts,
        config.prompts.negative,
        {
            dataURL: pose,
            preprocess: false
        },
        taskStore.inference_task.config
    );

    taskStore.inference_task.task_id = res.task_id;
    taskStore.inference_task.pretrained_model_name = baseModel.value;
    emit('taskStarted');

    await updateTaskStatus();
};

const stop = async() => {

    if(!confirm("Are you sure to stop the current task?"))
        return;

    if(taskStore.inference_task.task_id) {
        await inferenceAPI.stopTask(taskStore.inference_task.task_id);
        stopTracingTask();
        taskStore.clearInferenceTask();
        isRunning.value = false;
    }
};

const notReadyToRun = computed(() => {
    return !nodeStore.isNodeFilled
        || baseModel.value === ''
        || (extractedTags.value.length === 0 && props.extraPrompts === "")
        || taskStore.inference_task.model_id === "";
});

const baseModelSelectionDisabled = computed(() => {
    return !nodeStore.isNodeFilled || isRunning.value;
});

const consoleButtonType = computed(() => {
    if(baseModel.value === "") {
        return "primary";
    }

    return "default";
});

const updateTaskStatus = async () => {

    taskResultStatus.value = "";

    if(taskStore.inference_task.task_id !== "") {
        isRunning.value = true;
        baseModel.value = taskStore.inference_task.pretrained_model_name;
        await traceTaskRunningStatus();
    }
};

let currentLine = 0;

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

    if(!nodeStore.isNodeFilled)
        return true;

    try {
            if(taskStore.training_task.task_id === null) {
                stopTracingTask();
                return false;
            }

            const taskStatus = await inferenceAPI.getTaskStatus(taskStore.inference_task.task_id);

            switch(taskStatus.status) {
                case 'PENDING':
                    // task unknown
                    // possibly deleted
                    isRunning.value = false;
                    taskStore.clearInferenceTask();
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
                        await downloadImages();
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
    const logs = await inferenceAPI.getTaskLog(taskStore.inference_task.task_id, currentLine);

    if(logs && logs.length) {
        logs.forEach((line) => {
            appendLog(line);
        });
        currentLine += logs.length;
    }
};

const appendLog = (logText) => {
    logs.value = logs.value +logText.replace(/\n/g, "<br />");
    if(!/\n$|\r$|\n\r$|\r\n$/.test(logText)) {
        logs.value += "<br/>"
    }
};

const clearLog = () => {
    logs.value = "";
};

const downloadImages = async () => {
    if(taskStore.inference_task.image_downloaded)
        return;

    for(let i=0, l=taskStore.inference_task.config.num_images; i<l; i++) {
        const res = await inferenceAPI.getImage(taskStore.inference_task.task_id, i);
        emit('image', i, res.dataurl);
    }
};

onMounted(async () => {
    await updateTaskStatus();
});

onBeforeUnmount(() => {
    stopTracingTask();
});

const advancedVisible = ref(false);
const toggleAdvancedVisible = () => {
    advancedVisible.value = !advancedVisible.value;
};
</script>

<template>
    <a-button type="primary" size="large" :loading="isRunning" :disabled="notReadyToRun" @click="run">Generate Image</a-button>

    <a-button :type="consoleButtonType" size="large" class="runner-config" @click="showModal">
        <template #icon>
            <code-outlined />
        </template>
    </a-button>

    <a-modal
    :visible="modalVisible"
    title="Inference"
    @ok="hideModal"
    @cancel="hideModal"
    width="800px"
    :destroy-on-close="true"
    :mask-closable="false"
  >
    <div class="running-node">
      <a-alert
        v-if="isRunning && nodeStore.isNodeFilled"
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
      <a-select v-model:value="baseModel" :disabled="baseModelSelectionDisabled" style="width: 400px">
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
                        <a-input type="number" v-model:value.number="taskStore.inference_task.config.image_width" placeholder="Image width" />
                    </a-col>
                </a-row>
            </a-form-item>
            <a-form-item label="Image height" name="image-height">
                <a-row :gutter="8">
                    <a-col :span="8">
                        <a-input type="number" v-model:value.number="taskStore.inference_task.config.image_height" placeholder="Image height" />
                    </a-col>
                </a-row>
            </a-form-item>
            <a-form-item label="Steps" name="steps">
                <a-row :gutter="8">
                    <a-col :span="8">
                        <a-input type="number" v-model:value.number="taskStore.inference_task.config.steps" placeholder="Steps" />
                    </a-col>
                </a-row>
            </a-form-item>
            <a-form-item label="Weight" name="weight">
                <a-row :gutter="8">
                    <a-col :span="8">
                        <a-input type="number" v-model:value.number="taskStore.inference_task.config.weight" placeholder="Weight" />
                    </a-col>
                </a-row>
            </a-form-item>
            <a-form-item label="Num images" name="num-images">
                <a-row :gutter="8">
                    <a-col :span="8">
                        <a-input type="number" v-model:value.number="taskStore.inference_task.config.num_images" placeholder="Num images" />
                    </a-col>
                </a-row>
            </a-form-item>
            <a-form-item label="Pose weight" name="pose-weight">
                <a-row :gutter="8">
                    <a-col :span="8">
                        <a-input type="number" v-model:value.number="taskStore.inference_task.config.pose_weight" placeholder="Pose weight" />
                    </a-col>
                </a-row>
            </a-form-item>
        </div>
        <template #footer>
            <a-button type="primary" danger v-if="isRunning" :disabled="!nodeStore.isNodeFilled" @click="stop">Stop</a-button>
        </template>
  </a-modal>
</template>

<style scoped lang="stylus">
.runner-config
    margin-left 6px
.advanced-options-divider
    color #cccccc
    cursor pointer
</style>
