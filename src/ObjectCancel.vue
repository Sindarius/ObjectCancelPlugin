<template>
  <div class="primary-container" ref="primarycontainer">
    <div class="left-container">
      <v-row>
        <v-col>
          <h3>Object Cancel</h3>
        </v-col>
        <v-col>
          <v-spacer />
          <v-btn @click="resetView">Reset</v-btn>
        </v-col>
      </v-row>

      <v-simple-table class="table-overflow">
        <thead>
          <tr>
            <th>Name</th>
          </tr>
        </thead>
        <tbody>
          <tr
            :class="{ active: isBuilding(idx), cancelled: obj.cancelled }"
            :key="idx"
            @click="startCancelObject(obj, idx)"
            @mouseleave="mouseOverIdx(-1)"
            @mouseover="mouseOverIdx(idx)"
            v-for="(obj, idx) in buildObjects"
          >
            <td>{{ obj.name }}</td>
          </tr>
        </tbody>
      </v-simple-table>
    </div>
    <div class="right-container">
      <div class="viewer-box" ref="container"></div>
    </div>
    <v-dialog max-width="450" v-model="objectDialogData.showDialog">
      <v-card>
        <v-card-title class="headline">
          <v-icon class="mr-2">{{
            objectDialogData.info.cancelled ? "mdi-reload" : "mdi-cancel"
          }}</v-icon>
          {{ objectDialogData.info.cancelled ? "Resume" : "Cancel" }} Object
        </v-card-title>
        <v-card-text>{{ objectDialogData.info.name }}</v-card-text>
        <v-card-actions>
          <v-row no-gutters>
            <v-col cols="6">
              <v-btn @click="objectDialogCancelObject" block color="primary"
                >Ok</v-btn
              >
            </v-col>
            <v-col cols="6">
              <v-btn
                @click="objectDialogData.showDialog = false"
                block
                color="error"
                >Cancel</v-btn
              >
            </v-col>
          </v-row>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
.active {
  background-color: green !important;
}

.cancelled {
  background-color: red !important;
}
</style>

<style>
.axis {
  font-size: 8px;
}
.buildobject-svgtxt {
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
  pointer-events: none;
}
.primary-container {
  position: relative;
  width: 100%;
  height: 100%;
}

.left-container {
  position: absolute;
  left: 0;
  width: 50%;
  top: 0;
  height: 100%;
}

.right-container {
  position: absolute;
  left: 50%;
  right: 0;
  height: 100%;
  top: 0;
}

.table-overflow {
  overflow-y: auto;
  height: 80%;
}
</style>

<script>
"use strict";

import ObjectCancel from "./objectcancel";
import { mapState, mapGetters, mapActions } from "vuex";
import { isPrinting, KinematicsName } from "@/store/machine/modelEnums";

var objectCancel;
export default {
  data: function () {
    return {
      buildObjects: [],
      objectDialogData: {
        showDialog: false,
        index: 0,
        info: {},
      },
    };
  },
  computed: {
    ...mapState("machine/model", {
      axes: (state) => state.move.axes,
      job: (state) => state.job,
      status: (state) => state.state.status,
      kinematicsName: (state) => state.move.kinematics.name,
    }),
    ...mapGetters(["isConnected"]),
    isDelta() {
      return (
        this.kinematicsName === KinematicsName.delta ||
        this.kinematicsName === KinematicsName.rotaryDelta
      );
    },
    build() {
      return this.job?.build;
    },
  },
  activated() {
    this.resize();
  },

  mounted() {
    let globalContainer = getComputedStyle(
      document.getElementById("global-container")
    );
    let globalContainerHeight =
      parseInt(globalContainer.height) +
      parseInt(globalContainer.paddingTop) +
      parseInt(globalContainer.paddingBottom);
    let height = window.innerHeight - globalContainerHeight * 2;

    objectCancel = new ObjectCancel(
      this.$refs.container,
      this.$refs.container.clientWidth,
      height
    );

    //watch for resizing events
    window.addEventListener("resize", () => {
      this.resize();
    });

    this.$nextTick(() => {
      this.resize();
      objectCancel.resetZoom();
    });

    if (isPrinting(this.status)) {
      objectCancel.updateData(this.job.build);
    }

    objectCancel.cancelCallback = (obj, idx) =>
      this.startCancelObject(obj, idx);

    setTimeout(() => {
      this.resize();
    }, 2000);
  },
  methods: {
    ...mapActions("machine", {
      sendCode: "sendCode",
    }),

    startCancelObject(obj, idx) {
      this.objectDialogData.index = idx;
      this.objectDialogData.info = obj;
      this.objectDialogData.showDialog = true;
    },
    isBuilding(idx) {
      return idx == this.build?.currentObject;
    },
    resize() {
      let contentArea = getComputedStyle(
        document.getElementsByClassName("v-toolbar__content")[0]
      );
      let globalContainer = getComputedStyle(
        document.getElementById("global-container")
      );
      let primaryContainer = getComputedStyle(this.$refs.primarycontainer);
      let contentAreaHeight =
        parseInt(contentArea.height) +
        parseInt(contentArea.paddingTop) +
        parseInt(contentArea.paddingBottom);
      let globalContainerHeight =
        parseInt(globalContainer.height) +
        parseInt(globalContainer.paddingTop) +
        parseInt(globalContainer.paddingBottom);
      let viewerHeight =
        window.innerHeight -
        contentAreaHeight -
        globalContainerHeight -
        parseInt(primaryContainer.marginTop);
      this.$refs.primarycontainer.style.height =
        (viewerHeight >= 300 ? viewerHeight : 300) + "px";
      if (objectCancel) {
        objectCancel.resize(
          this.$refs.container.clientWidth,
          this.$refs.primarycontainer.style.height
        );
        this.updateBuildVolume();
      }
    },
    async objectDialogCancelObject() {
      this.objectDialogData.showDialog = false;
      let action = this.objectDialogData.info.cancelled ? "U" : "P";
      await this.sendCode(`M486 ${action}${this.objectDialogData.index}`);
      this.objectDialogData.info = {};
    },
    updateBuildVolume() {
      objectCancel.updateBuildVolume(this.axes, this.isDelta);
    },
    mouseOverIdx(idx) {
      objectCancel.setMouseOverIdx(idx);
    },
    resetView() {
      this.updateBuildVolume();
      objectCancel.resetZoom();
    },
  },
  watch: {
    isConnected(to) {
      if (to) {
        this.resize();
      }
    },
    axes: {
      deep: true,
      handler(to) {
        if (objectCancel) {
          if (this.build && this.build.objects) {
            this.buildObjects = [];
            this.buildObjects.push(...this.build.objects);
            objectCancel.updateData(this.build);
          }
          objectCancel.setCursorPosition(to);
        }
      },
    },
    status(to) {
      if (!isPrinting(to)) {
        this.buildObjects = [];
      }
    },
  },
};
</script>
