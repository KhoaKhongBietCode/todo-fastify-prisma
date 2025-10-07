const fastify = require('fastify')({ logger: true })
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcrypt')

const prisma = new PrismaClient()

// Đăng ký plugin JWT
fastify.register(require('@fastify/jwt'), {
    secret: 'supersecretkey'
})

// Middleware xác thực token
fastify.decorate("authenticate", async function (request, reply) {
    try {
        await request.jwtVerify()
    } catch (err) {
        return reply.status(401).send({ message: 'Unauthorized' })
    }
})

// REgisterr
fastify.post('/register', async (request, reply) => {
    const { username, password } = request.body

    if (!username || !password) {
        return reply.status(400).send({ message: 'Missing username or password' })
    }

    const existing = await prisma.user.findUnique({ where: { username } })
    if (existing) {
        return reply.status(400).send({ message: 'User already exists' })
    }

    const hashed = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
        data: { username, password: hashed }
    })

    return reply.status(201).send({ message: 'User created', user })
})

// LOgin
fastify.post('/login', async (request, reply) => {
    const { username, password } = request.body

    const user = await prisma.user.findUnique({ where: { username } })
    if (!user) return reply.status(400).send({ message: 'Invalid username or password' })

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) return reply.status(400).send({ message: 'Invalid username or password' })

    // Tạo JWT token
    const token = fastify.jwt.sign({ id: user.id, username: user.username })
    return reply.send({ token })
})

// Chỉ user login mới được truy cập
fastify.post('/todos', { preValidation: [fastify.authenticate] }, async (request, reply) => {
    const { title } = request.body
    const userId = request.user.id // Lấy userId từ token

    try {
        const todo = await prisma.todo.create({
            data: { title, userId }
        })
        return reply.status(201).send(todo)
    } catch (error) {
        console.error(error)
        return reply.status(500).send({ message: 'Error creating todo' })
    }
})

// GET todo (chỉ todo của user đang đăng nhập)
fastify.get('/todos', { preValidation: [fastify.authenticate] }, async (request, reply) => {
    try {
        const todos = await prisma.todo.findMany({
            where: { userId: request.user.id },
            orderBy: { id: 'asc' },
        })
        return todos
    } catch (err) {
        console.error(err)
        return reply.status(500).send({ message: 'Server error' })
    }
})

// Cập nhật todo
fastify.put('/todos/:id', { preValidation: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params
    const { completed } = request.body
    const userId = request.user.id

    try {
        const todo = await prisma.todo.updateMany({
            where: { id: parseInt(id), userId },
            data: { completed },
        })

        if (todo.count === 0)
            return reply.status(404).send({ message: 'Todo not found or not yours' })

        return reply.send({ message: 'Updated successfully' })
    } catch (err) {
        console.error(err)
        return reply.status(500).send({ message: 'Server error' })
    }
})

// Xoá todo
fastify.delete('/todos/:id', { preValidation: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params
    const userId = request.user.id

    try {
        const deleted = await prisma.todo.deleteMany({
            where: { id: parseInt(id), userId },
        })

        if (deleted.count === 0)
            return reply.status(404).send({ message: 'Todo not found or not yours' })

        return reply.send({ message: 'Todo deleted' })
    } catch (err) {
        console.error(err)
        return reply.status(500).send({ message: 'Server error' })
    }
})

const start = async () => {
    try {
        await fastify.listen({ port: 3000 })
        console.log('🚀 Server is running at http://localhost:3000')
    } catch (err) {
        fastify.log.error(err)
        process.exit(1)
    }
}
start()
