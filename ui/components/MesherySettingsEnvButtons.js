import { Button, Typography,FormGroup,TextField,InputAdornment, IconButton } from '@material-ui/core'
import React from 'react'
import { useRef } from 'react';
import AddIconCircleBorder from '../assets/icons/AddIconCircleBorder'
import CloseIcon from "@material-ui/icons/Close";
import PromptComponent from './PromptComponent';
import CloudUploadIcon from "@material-ui/icons/CloudUpload";
import dataFetch, { promisifiedDataFetch } from "../lib/data-fetch";
import { updateProgress } from '../lib/store';
import { withSnackbar } from 'notistack';
import { extractKubernetesCredentials } from './ConnectionWizard/helpers/kubernetesHelpers';

const MesherySettingsEnvButtons = ({ enqueueSnackbar,closeSnackbar }) => {
  let k8sfileElementVal = "";
  let formData = new FormData();
  const ref = useRef(null)

  const handleConfigSnackbars = ctxs => {
    updateProgress({ showProgress : false });
    for (let ctx of ctxs.inserted_contexts) {
      handleCredentialsPost(ctx);
      const msg = `Cluster ${ctx.name} at ${ctx.server} connected`
      enqueueSnackbar(msg, {
        variant : "success",
        action : (key) => (
          <IconButton key="close" aria-label="Close" color="inherit" onClick={() => closeSnackbar(key)}>
            <CloseIcon />
          </IconButton>
        ),
        autoHideDuration : 7000,
      });
    }
    for (let ctx of ctxs.updated_contexts) {
      const msg = `Cluster ${ctx.name} at ${ctx.server} already exists`
      enqueueSnackbar(msg, {
        variant : "info",
        action : (key) => (
          <IconButton key="close" aria-label="Close" color="inherit" onClick={() => closeSnackbar(key)}>
            <CloseIcon />
          </IconButton>
        ),
        autoHideDuration : 7000,
      });
    }

    for (let ctx of ctxs.errored_contexts) {
      const msg = `Failed to add cluster ${ctx.name} at ${ctx.server}`
      enqueueSnackbar(msg, {
        variant : "error",
        action : (key) => (
          <IconButton key="close" aria-label="Close" color="inherit" onClick={() => closeSnackbar(key)}>
            <CloseIcon />
          </IconButton>
        ),
        autoHideDuration : 7000,
      });
    }
  }

  function handleCredentialsPost(obj){
    // right now we just posting the credentials when we insert a new context
    const data = {
      name : obj.name,
      type : "kubernetes",
      secret : extractKubernetesCredentials(obj),
    }

    dataFetch(
      "/api/integrations/credentials",
      {
        credentials : "include",
        method : "POST",
        body : JSON.stringify(data),
      },
      () => {
        enqueueSnackbar("Credentials saved successfully!", {
          variant : "success",
          autoHideDuration : 2000,
        });
      }
    );
  }

  const handleError = (msg) => (error) => {
    updateProgress({ showProgress : false });
    enqueueSnackbar(`${msg}: ${error}`, {
      variant : "error", preventDuplicate : true,
      action : (key) => (
        <IconButton key="close" aria-label="Close" color="inherit" onClick={() => closeSnackbar(key)}>
          <CloseIcon />
        </IconButton>
      ),
      autoHideDuration : 7000,
    });
  };
  const handleChange = () => {
    const field = document.getElementById("k8sfile");
    const textField = document.getElementById("k8sfileLabelText");
    if (field instanceof HTMLInputElement) {
      if (field.files.length < 1) return;
      const name = field.files[0].name;
      const formdata = new FormData();
      formdata.append("k8sfile", field.files[0])
      textField.value = name;
      formData = formdata;

    }
  }
  const uploadK8SConfig = async () => {
    return await promisifiedDataFetch(
      "/api/system/kubernetes",
      {
        method : "POST",
        body : formData,
      }
    )
  }
  const handleClick = async () => {
    const modal = ref.current;
    let response = await modal.show({
      title : "Add Kubernetes Cluster(s)",
      subtitle :
        <>
          <div
            style={{ "overflow" : "hidden" }}
          >
            <Typography variant="h6">
              Upload your kubeconfig
            </Typography>
            <Typography variant="body2">
              commonly found at ~/.kube/config
            </Typography>
            <FormGroup>
              <input
                id="k8sfile"
                type="file"
                value={k8sfileElementVal}
                onChange={handleChange}
                style={{ "display" : "none", }}
              />

              <TextField
                id="k8sfileLabelText"
                name="k8sfileLabelText"
                style={{ "cursor" : "pointer", }}
                placeholder="Upload kubeconfig"
                variant="outlined"
                fullWidth
                onClick={() => {
                  document.querySelector("#k8sfile")?.click();
                }}
                margin="normal"
                InputProps={{
                  readOnly : true,
                  endAdornment : (
                    <InputAdornment position="end">
                      <CloudUploadIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </FormGroup>
          </div>
        </>,
      options : ["IMPORT","CANCEL"]
    })

    if (response === "IMPORT") {
      if (formData.get("k8sfile") === null) {
        handleError("No file selected")("Please select a valid kube config")
        return;
      }

      const inputFile = ( formData.get( "k8sfile" ).name );
      const invalidExtensions = /^.*\.(jpg|gif|jpeg|pdf|png|svg)$/i;

      if (invalidExtensions.test(inputFile)  ) {
        handleError("Invalid file selected")("Please select a valid kube config")
        return;
      }

      uploadK8SConfig().then((obj) => {
        handleConfigSnackbars(obj);
      }).
        catch(err => {
          handleError("failed to upload kubernetes config")(err)
        })
      formData.delete("k8sfile");
    }
  }

  return (
    <div>
      <Button
        type="submit"
        variant="contained"
        color="primary"
        size="large"
        onClick={handleClick}
        style={{
          "padding" : "8px",
          "borderRadius" : 5,
          "marginRight" : "2rem"
        }}
        data-cy="btnResetDatabase"
      >
        <AddIconCircleBorder style={{ width : "20px",height : "20px" }} />
        <Typography
          style={{
            "paddingLeft" : "4px" ,
            "marginRight" : "4px"
          }}
        > Add Cluster</Typography>
      </Button>
      <PromptComponent ref={ref} />
    </div>
  )
}

export default withSnackbar(MesherySettingsEnvButtons)