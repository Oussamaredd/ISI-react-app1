/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function seed(knex) {
  // Insert sample hotels
  await knex('hotels').del();
  await knex('hotels').insert([
    { name: 'Hotel A', is_available: true },
    { name: 'Hotel B', is_available: true },
    { name: 'Hotel C', is_available: false },
    { name: 'Hotel D', is_available: true }
  ]);

  // Insert sample tickets
  await knex('tickets').del();
  await knex('tickets').insert([
    { name: 'Sample Ticket 1', price: 10.00, status: 'OPEN', hotel_id: 1 },
    { name: 'Sample Ticket 2', price: 20.50, status: 'COMPLETED', hotel_id: 2 },
    { name: 'Sample Ticket 3', price: 15.75, status: 'OPEN', hotel_id: 3 },
    { name: 'Sample Ticket 4', price: 30.00, status: 'OPEN', hotel_id: 1 }
  ]);
}