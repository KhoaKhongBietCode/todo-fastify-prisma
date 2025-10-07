const fastify = require('fastify')({ logger: true })
const { Client } = require('pg')
const { PrismaClient } = require('@prisma/client')

// Khởi tạo Prisma
const prisma = new PrismaClient()

// Cấu hình connect DB
const client = new Client({
    user: 'postgres',
    host: 'localhost',
    database: 'tododb',
    password: '123456789',
    port: 5432,
})
client.connect()

// Tạo todo
fastify.post('/todos', async (request, reply) => {
    const { title } = request.body

    try {
        const todo = await prisma.todo.create({
            data: { title }
        })
        return reply.status(201).send(todo)
    } catch (error) {
        console.error(error)
        return reply.status(500).send({ message: 'Error creating todo' })
    }
})

// GET
fastify.get('/todos', async (request, reply) => {
    const { id } = request.query;

    try {
        if (id) {
            const todo = await prisma.todo.findUnique({
                where: { id: parseInt(id) },
            });

            if (!todo) {
                return reply.status(404).send({ message: 'Todo not found' });
            }

            return todo;
        } else {
            const todos = await prisma.todo.findMany({
                orderBy: { id: 'asc' },
            });
            return todos;
        }
    } catch (err) {
        console.error(err);
        return reply.status(500).send({ message: 'Server error' });
    }
});


// Cập nhật todo
fastify.put('/todos/:id', async (request, reply) => {
    const { id } = request.params;
    const { completed } = request.body;

    try {
        const todo = await prisma.todo.update({
            where: { id: parseInt(id) },
            data: { completed },
        });

        return todo;
    } catch (err) {
        if (err.code === 'P2025') {
            return reply.status(404).send({ message: 'Todo not found' });
        }
        console.error(err);
        return reply.status(500).send({ message: 'Server error' });
    }
});


// DELETE todo theo id hoặc xoá tất cả nếu không có id
fastify.delete('/todos/:id?', async (request, reply) => {
    const { id } = request.params;

    try {
        if (id) { //Xoá 1
            const todo = await prisma.todo.delete({
                where: { id: parseInt(id) },
            });

            return {
                message: `Todo with id ${id} deleted`,
                deleted: todo,
            };
        } else {
            // Xoá tất
            const deleted = await prisma.todo.deleteMany({});
            if (deleted.count === 0) {
                return reply.status(404).send({ message: 'No todos to delete' });
            }

            return {
                message: `${deleted.count} todos deleted`,
            };
        }
    } catch (err) {
        if (err.code === 'P2025') {
            return reply.status(404).send({ message: 'Todo not found' });
        }
        console.error(err);
        return reply.status(500).send({ message: 'Server error' });
    }
});


// Start server
const start = async () => {
    try {
        await fastify.listen({ port: 3000 })
        console.log(' Server is running on http://localhost:3000')
    } catch (err) {
        fastify.log.error(err)
        process.exit(1)
    }
}
start()
