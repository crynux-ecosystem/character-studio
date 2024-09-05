import { defineStore } from 'pinia'

export const useTaskStore = defineStore('task', {
    state: () => ({
        training_task: {
            task_id: '',
            pretrained_model_name: '',
            model_downloaded: false,
            config: {
                image_width: 768,
                image_height: 1024,
                epoch: 40,
                batch_size: 5,
                repeat: 2,
                network_dimension: 32,
                learning_rate: '5e-5',
                optimizer: 'adamW'
            }
        },
        inference_task: {
            model_id: '',
            task_id: '',
            pretrained_model_name: '',
            image_downloaded: false,
            config: {
                image_width: 768,
                image_height: 1024,
                steps: 40,
                weight: 1,
                num_images: 6,
                pose_weight: 1
            }
        },
    }),
    actions: {
        clearTrainingTask(){
            this.training_task.task_id = '';
            this.training_task.pretrained_model_name = '';
        },
        clearInferenceTask() {
            this.inference_task.model_id = "";
            this.inference_task.task_id = "";
            this.inference_task.pretrained_model_name = "";
        }
    }
});
