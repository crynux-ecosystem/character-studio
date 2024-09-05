import config from '../config.json';

class Dataset {}

Dataset.imageNameToTraditionalTagFileName = (imageName) => {
    return imageName.replace(/\.[^.]+$/, ".txt")
};

Dataset.imageNameToCTFileName = (imageName) => {
    return imageName.replace(/\.[^.]+$/, ".ctf")
};

Dataset.saveAllImageTagsToTraditionalTxtFiles = async (dataset, datasetDirHandle) => {
    for(let i=0, l=dataset.images.length; i<l; i++) {
        await saveImageTagsToTraditionalTxtFile(dataset.images[i].name, dataset.imageTags[i], dataset.extraPrompts[i], datasetDirHandle);
    }
};

const saveImageTagsToTraditionalTxtFile = async (imageName, imageTags, extraPrompt, datasetDirHandle) => {
    const txtFileName = Dataset.imageNameToTraditionalTagFileName(imageName);

    let allTags = [];

    Object.keys(config.tag_structure).forEach((category) => {
        allTags = allTags.concat(imageTags[category]);
    });

    if(allTags.length === 0 && extraPrompt === "")
        return;

    let tagStr = String(allTags);

    if(extraPrompt !== "") {
        if(tagStr !== "") {
            tagStr += ","
        }
        tagStr += extraPrompt;
    }

    const txtFileHandle = await datasetDirHandle.getFileHandle(txtFileName, {create: true});
    const writer = await txtFileHandle.createWritable();
    await writer.write(tagStr);
    writer.close();
};

Dataset.saveTrainingTagsToFile = async (dataset, datasetDirHandle) => {
    const tagFileHandle = await datasetDirHandle.getFileHandle("ct_training_tags.ctf", {create: true});
    const writer = await tagFileHandle.createWritable();
    await writer.write(JSON.stringify(dataset.trainingTags));
    writer.close();
};

Dataset.loadTrainingTagsFromFile = async(datasetDirHandle) => {
    try {
        return await readTrainingTagsFile(datasetDirHandle);
    } catch (e) {
        return JSON.parse(JSON.stringify(config.tag_structure));
    }
};

Dataset.numOfTrainingTags = (trainingTags) => {
    let numTrainingTags = 0;
    Object.keys(trainingTags).forEach((category) => {
        numTrainingTags += trainingTags[category].length;
    });
    return numTrainingTags;
};

const readTrainingTagsFile = async (datasetDirHandle) => {
    try {
        const tagFileHandle = await datasetDirHandle.getFileHandle("ct_training_tags.ctf");
        const tagFile = await tagFileHandle.getFile();

        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = () => {
                resolve(JSON.parse(reader.result));
            };

            reader.onerror = (e) => {
                reject(e);
            }

            reader.readAsText(tagFile);
        });

    } catch (e) {
        return Promise.reject(e);
    }
};

Dataset.loadAllImageTagsFromCtFile = async (dataset, datasetDirHandle) => {
    for(let i=0, l=dataset.images.length; i<l; i++) {

        const [imageTags, extraText] = await Dataset.loadImageTagsFromCtFile(dataset.images[i].name, datasetDirHandle);

        dataset.imageTags[i] = imageTags;
        dataset.extraPrompts[i] = extraText;
    }
};

Dataset.loadImageTagsFromCtFile = async (imageName, datasetDirHandle) => {

    const ctTagFilename = Dataset.imageNameToCTFileName(imageName);

    const imageTags = JSON.parse(JSON.stringify(config.tag_structure));
    let extraText = "";

    try {
        const ctTagFileHandle = await datasetDirHandle.getFileHandle(ctTagFilename);
        const loadedTags = await readCtFile(ctTagFileHandle);

        Object.keys(imageTags).forEach((category) => {
            imageTags[category] = loadedTags[category];
        });

        if(loadedTags.extra_text) {
            extraText = loadedTags.extra_text;
        }

    } catch (e) {
        console.log("no existing tag files found");
    }

    return [imageTags, extraText];
};

Dataset.saveImageTagsToCtFile = async (imageName, imageTags, extraText, datasetDirHandle) => {

    const fileContent = JSON.parse(JSON.stringify(imageTags));
    fileContent.extra_text = extraText;

    const filename = Dataset.imageNameToCTFileName(imageName);
    const tagFileHandle = await datasetDirHandle.getFileHandle(filename, {create: true});
    const writer = await tagFileHandle.createWritable();
    await writer.write(JSON.stringify(fileContent));
    writer.close();
};

const readCtFile = async (fileHandle) => {
    const file = await fileHandle.getFile();

    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => {
            resolve(JSON.parse(reader.result));
        };

        reader.onerror = (err) => {
            reject(err);
        }

        reader.readAsText(file);
    });
};

export default Dataset;
