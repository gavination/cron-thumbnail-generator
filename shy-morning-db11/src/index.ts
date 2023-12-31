/**
 * Welcome to Cloudflare Workers!
 *
 * This is a template for a Scheduled Worker: a Worker that can run on a
 * configurable interval:
 * https://developers.cloudflare.com/workers/platform/triggers/cron-triggers/
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import { Snapshot, createActor } from 'xstate';
import { machine } from './cronMachine';

export interface Env {
	// Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
	// MY_KV_NAMESPACE: KVNamespace;
	//
	// Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
	// MY_DURABLE_OBJECT: DurableObjectNamespace;
	//
	// Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
	IMAGE_BUCKET: R2Bucket;

	// Example binding to a Service. Learn more at https://developers.cloudflare.com/workers/runtime-apis/service-bindings/
	// MY_SERVICE: Fetcher;
	//
	// Example binding to a Queue. Learn more at https://developers.cloudflare.com/queues/javascript-apis/
	// MY_QUEUE: Queue;
	//
	// Example binding to a D1 Database. Learn more at https://developers.cloudflare.com/workers/platform/bindings/#d1-database-bindings
	// DB: D1Database
}

export default {
	// The scheduled handler is invoked at the interval set in our wrangler.toml's
	// [[triggers]] configuration.
	async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
		// A Cron Trigger can make requests to other endpoints on the Internet,
		// publish to a Queue, query a D1 Database, and much more.
		//
		// We'll keep it simple and make an API call to a Cloudflare API:
		let resp = await fetch('https://api.cloudflare.com/client/v4/ips');
		let wasSuccessful = resp.ok ? 'success' : 'fail';

		// listing objects in R2 bucket
		let objects = await env.IMAGE_BUCKET.list();
		console.log('objects in bucket', objects);

		let restoredState = await env.IMAGE_BUCKET.get('actor.json');

		if (restoredState) {
			console.log('restored state', restoredState);
			const stateValue: Snapshot<JSON> = await restoredState.json();

			console.log('restored state value', stateValue);
			const imageActor = createActor(machine, { snapshot: stateValue }).start();
			imageActor.send({ type: 'SCAN' });

			// save the state and context of the machine
			const state = imageActor.getPersistedSnapshot();
			await env.IMAGE_BUCKET.put('actor.json', JSON.stringify(state));
		}

		// initializing machine
		const imageActor = createActor(machine).start();
		imageActor.send({ type: 'SCAN' });

		// save the state and context of the machine
		const state = imageActor.getPersistedSnapshot();
		await env.IMAGE_BUCKET.put('actor.json', JSON.stringify(state));

		// You could store this result in KV, write to a D1 Database, or publish to a Queue.
		// In this template, we'll just log the result:
		console.log(`trigger fired at ${event.cron}: ${wasSuccessful}`);
	},
};
