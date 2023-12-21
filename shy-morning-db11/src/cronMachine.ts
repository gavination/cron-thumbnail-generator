import { createMachine } from 'xstate';

export const machine = createMachine(
	{
		context: {
			errorMessages: [],
			imageLocation: '',
			thumbnailDestination: '',
			previouslyScannedImages: [],
		},
		id: 'ThumbnailGenerator - Cron based',
		initial: 'Idle',
		states: {
			Idle: {
				on: {
					SCAN: {
						target: 'ScanningForNewImages',
					},
				},
			},
			ScanningForNewImages: {
				invoke: {
					src: 'checkForNewImages',
					id: 'checkForNewImages',
					onDone: [
						{
							target: 'Idle',
							guard: 'no new images',
						},
					],
					onError: [
						{
							target: 'ReportingErrors',
						},
					],
				},
			},
			ReportingErrors: {
				invoke: {
					src: 'reportErrors',
					id: 'reportErrors',
					onDone: [
						{
							target: 'Idle',
						},
					],
				},
			},
			GeneratingThumbnails: {
				exit: {
					type: 'updateThumbnailList',
				},
				invoke: {
					src: 'generateThumnails',
					id: 'generateThumbnails',
					onDone: [
						{
							target: 'Idle',
						},
					],
					onError: [
						{
							target: 'ReportingErrors',
						},
					],
				},
			},
		},
		types: {
			events: {} as { type: 'SCAN' },
			context: {} as {
				errorMessages: unknown[];
				imageLocation: string;
				thumbnailDestination: string;
				previouslyScannedImages: string[];
			},
		},
	},
	{
		actions: {
			updateThumbnailList: ({ context, event }) => {},
		},
		actors: {
			checkForNewImages: createMachine({
				/* ... */
			}),
			generateThumnails: createMachine({
				/* ... */
			}),
			reportErrors: createMachine({
				/* ... */
			}),
		},
		guards: {
			'no new images': ({ context, event }, params) => {
				return false;
			},
		},
		delays: {},
	}
);
