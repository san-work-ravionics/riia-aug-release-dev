---
type: C4 Container
title: Model Store
status: stable
groma:
  id: model-store
  parent: rita
  technology: PyTorch, pickle (.pkl)
description: DDQN model weights stored as .pkl files on EC2; built by the training pipeline, never committed to git
---

PyTorch DDQN model weights stored in the models/ directory on the EC2 production instance. One model file per instrument. Built by the training pipeline (triggered via the Workflow Layer /train endpoint) and never committed to git. The Core component loads weights at inference time via ml_dispatch and model_compat (which handles cross-platform loading of Windows-trained models on Linux/Mac). Training history is tracked in the database, not in this store.
