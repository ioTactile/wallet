import {
  createRecordBodySchema,
  listRecordsQuerySchema,
  updateRecordBodySchema,
} from '@wallet/shared';
import type { FastifyInstance } from 'fastify';

import type { CreateRecord } from '../../application/create-record.js';
import type { DeleteRecord, GetRecord, ListRecords } from '../../application/list-records.js';
import type { RunIdempotent } from '../../application/run-idempotent.js';
import type { UpdateRecord } from '../../application/update-record.js';
import { hashIdempotencyPayload, parseIdempotencyKey } from './idempotency.js';
import { presentListedRecords, presentRecord } from './present-record.js';

export type RecordRoutesDeps = {
  listRecords: ListRecords;
  getRecord: GetRecord;
  createRecord: CreateRecord;
  updateRecord: UpdateRecord;
  deleteRecord: DeleteRecord;
  runIdempotent: RunIdempotent;
};

export async function registerRecordRoutes(app: FastifyInstance, deps: RecordRoutesDeps) {
  app.get('/records', { onRequest: [app.authenticate] }, async (request) => {
    const query = listRecordsQuerySchema.parse(request.query);
    return presentListedRecords(await deps.listRecords.execute(request.user.sub, query));
  });

  app.get('/records/:id', { onRequest: [app.authenticate] }, async (request) => {
    const { id } = request.params as { id: string };
    const record = await deps.getRecord.execute(request.user.sub, id);
    return presentRecord(record);
  });

  app.post('/records', { onRequest: [app.authenticate] }, async (request, reply) => {
    const key = parseIdempotencyKey(request.headers);
    const body = createRecordBodySchema.parse(request.body);
    const result = await deps.runIdempotent.execute({
      userId: request.user.sub,
      key,
      method: 'POST',
      path: '/records',
      requestHash: hashIdempotencyPayload(body),
      run: async () => {
        const record = await deps.createRecord.execute(request.user.sub, body);
        return { status: 201, body: presentRecord(record) };
      },
    });
    return reply.code(result.status).send(result.body);
  });

  app.patch('/records/:id', { onRequest: [app.authenticate] }, async (request) => {
    const { id } = request.params as { id: string };
    const body = updateRecordBodySchema.parse(request.body);
    const record = await deps.updateRecord.execute(request.user.sub, id, body);
    return presentRecord(record);
  });

  app.delete('/records/:id', { onRequest: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await deps.deleteRecord.execute(request.user.sub, id);
    return reply.code(204).send();
  });
}
