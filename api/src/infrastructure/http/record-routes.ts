import {
  createRecordBodySchema,
  listRecordsQuerySchema,
  recordSchema,
  recordsResponseSchema,
  updateRecordBodySchema,
  type Record as RecordDto,
  type RecordsResponse,
} from '@wallet/shared';
import type { FastifyInstance } from 'fastify';

import type { CreateRecord } from '../../application/create-record.js';
import type { DeleteRecord, GetRecord, ListRecords } from '../../application/list-records.js';
import { mapRecord } from '../../application/map-record.js';
import type { UpdateRecord } from '../../application/update-record.js';
import type { LedgerRecord } from '../../domain/record.js';

export type RecordRoutesDeps = {
  listRecords: ListRecords;
  getRecord: GetRecord;
  createRecord: CreateRecord;
  updateRecord: UpdateRecord;
  deleteRecord: DeleteRecord;
};

export async function registerRecordRoutes(app: FastifyInstance, deps: RecordRoutesDeps) {
  app.get('/records', { onRequest: [app.authenticate] }, async (request) => {
    const query = listRecordsQuerySchema.parse(request.query);
    return presentRecords(await deps.listRecords.execute(request.user.sub, query));
  });

  app.get('/records/:id', { onRequest: [app.authenticate] }, async (request) => {
    const { id } = request.params as { id: string };
    const record = await deps.getRecord.execute(request.user.sub, id);
    return presentRecord(record);
  });

  app.post('/records', { onRequest: [app.authenticate] }, async (request, reply) => {
    const body = createRecordBodySchema.parse(request.body);
    const record = await deps.createRecord.execute(request.user.sub, body);
    return reply.code(201).send(presentRecord(record));
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

function presentRecord(record: LedgerRecord): RecordDto {
  return recordSchema.parse(mapRecord(record));
}

function presentRecords(payload: RecordsResponse) {
  return recordsResponseSchema.parse(payload);
}
