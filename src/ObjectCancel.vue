<template>
	<div class="primary-container" ref="primarycontainer" v-resize="resize">
		<v-row>
			<v-col cols="4">
				<v-row dense>
					<v-col cols="6">
						<h3>Object Cancel</h3>
					</v-col>
                    <v-spacer></v-spacer>
					<v-col cols="2">
						<v-btn @click="resetView">Reset</v-btn>
					</v-col>
				</v-row>
				<v-simple-table>
					<thead>
						<tr>
							<th>Name</th>
						</tr>
					</thead>
					<tbody>
						<tr :class="{active :isBuilding (idx), cancelled : obj.cancelled }" :key="idx" @click="startCancelObject(obj, idx)" @mouseleave="mouseOverIdx(-1)" @mouseover="mouseOverIdx(idx)" v-for="(obj, idx) in buildObjects.objects">
							<td>{{obj.name}}</td>
						</tr>
					</tbody>
				</v-simple-table>
			</v-col>
			<v-col cols="8">
				<div class="viewer-box" ref="container"></div>
			</v-col>
		</v-row>
		<v-dialog max-width="450" v-model="objectDialogData.showDialog">
			<v-card>
				<v-card-title class="headline">
					<v-icon class="mr-2">{{ objectDialogData.info.cancelled ? 'mdi-reload' : 'mdi-cancel' }}</v-icon>
					{{ objectDialogData.info.cancelled ? 'Resume' : 'Cancel' }} Object
				</v-card-title>
				<v-card-text>{{ objectDialogData.info.name }}</v-card-text>
				<v-card-actions>
					<v-row no-gutters>
						<v-col cols="6">
							<v-btn @click="objectDialogCancelObject" block color="primary">Ok</v-btn>
						</v-col>
						<v-col cols="6">
							<v-btn @click="objectDialogData.showDialog = false" block color="error">Cancel</v-btn>
						</v-col>
					</v-row>
				</v-card-actions>
			</v-card>
		</v-dialog>
	</div>
</template>

<style scoped>
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

.active {
	background-color: green !important;
}

.cancelled {
	background-color: red !important;
}
</style>

<script>
'use strict';

import ObjectCancel from './objectcancel';
import {mapState, mapGetters, mapActions} from 'vuex';
import {isPrinting} from '../../store/machine/modelEnums';

var objectCancel;
export default {
	data: function () {
		return {
			objectDialogData: {
				showDialog: false,
				index: 0,
				info: {},
			},
		};
	},
	computed: {
		...mapState('machine/model', {
			axes: (state) => state.move.axes,
			job: (state) => state.job,
			status: (state) => state.state.status,
		}),
		...mapGetters(['isConnected']),
		buildObjects: function () {
			if (isPrinting(this.status)) {
				return this.job.build;
			}
			return [];
		},
	},
	mounted() {
		let globalContainer = getComputedStyle(document.getElementById('global-container'));
		let globalContainerHeight = parseInt(globalContainer.height) + parseInt(globalContainer.paddingTop) + parseInt(globalContainer.paddingBottom);
		let height = window.innerHeight - globalContainerHeight * 2;

		objectCancel = new ObjectCancel(this.$refs.container, this.$refs.container.clientWidth, height);
		this.resize();

		//watch for resizing events
		window.addEventListener('resize', () => {
			this.$nextTick(() => {
				this.resize();
			});
		});

		if (isPrinting(this.status)) {
			objectCancel.updateData(this.job.build);
		}

		objectCancel.cancelCallback = (obj, idx) => this.startCancelObject(obj, idx);

		setTimeout(() => {
			this.resize();
			this.updateBuildVolume();
		}, 5000);
	},
	methods: {
		...mapActions('machine', {
			sendCode: 'sendCode',
		}),

		startCancelObject(obj, idx) {
			this.objectDialogData.index = idx;
			this.objectDialogData.info = obj;
			this.objectDialogData.showDialog = true;
		},
		isBuilding(idx) {
			return idx == this.buildObjects.currentObject;
		},
		resize() {
			let contentArea = getComputedStyle(document.getElementsByClassName('v-toolbar__content')[0]);
			let globalContainer = getComputedStyle(document.getElementById('global-container'));
			let primaryContainer = getComputedStyle(this.$refs.primarycontainer);
			let contentAreaHeight = parseInt(contentArea.height) + parseInt(contentArea.paddingTop) + parseInt(contentArea.paddingBottom);
			let globalContainerHeight = parseInt(globalContainer.height) + parseInt(globalContainer.paddingTop) + parseInt(globalContainer.paddingBottom);
			let viewerHeight = window.innerHeight - contentAreaHeight - globalContainerHeight - parseInt(primaryContainer.marginTop);
			this.$refs.primarycontainer.style.height = (viewerHeight >= 300 ? viewerHeight : 300) + 'px';
			if (objectCancel) {
				objectCancel.resize(this.$refs.container.clientWidth, this.$refs.primarycontainer.style.height);
			}
		},
		async objectDialogCancelObject() {
			this.objectDialogData.showDialog = false;
			let action = this.objectDialogData.info.cancelled ? 'U' : 'P';
			await this.sendCode(`M486 ${action}${this.objectDialogData.index}`);
			this.objectDialogData.info = {};
		},
		updateBuildVolume() {
			objectCancel.updateBuildVolume(this.axes);
		},
		mouseOverIdx(idx) {
			objectCancel.setMouseOverIdx(idx);
		},
		resetView() {
			objectCancel.resetZoom();
		},
	},
	watch: {
		isConnected(to) {
			if (to) {
				this.updateBuildVolume();
			}
		},
		buildObjects: {
			deep: true,
			handler(to) {
				if (objectCancel) {
					objectCancel.updateData(to);
				}
			},
		},
		axes: {
			deep: true,
			handler(to) {
				if (objectCancel) {
					objectCancel.setCursorPosition(to);
				}
			},
		},
	},
};
</script>

