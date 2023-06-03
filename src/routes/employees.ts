import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import bcryptjs from 'bcryptjs'

import { prisma } from '../lib/prisma'

export async function employeesRoutes(app: FastifyInstance) {
  app.get('/employees', async (request) => {
    await request.jwtVerify()

    const employees = await prisma.user.findMany({
      include: {
        employee: true,
      },
    })

    return employees.map((employee) => {
      return {
        id: employee.id,
        employeeId: employee.employee?.id,
        name: employee.name,
        email: employee.email,
        avatarUrl: employee.avatarUrl,
      }
    })
  })

  app.post('/employees', async (request, reply) => {
    const bodySchema = z.object({
      name: z.string(),
      cpf: z.string(),
      phone: z.string(),
      address: z.string(),
      email: z.string().email(),
      password: z.string().min(6, 'A senha precisa de no mínimo 6 caracteres'),
      avatarUrl: z.string().nullable().default(null),
    })

    const { name, cpf, phone, address, email, password, avatarUrl } =
      bodySchema.parse(request.body)

    const employee = await prisma.user.findFirst({
      where: {
        OR: [{ cpf }, { email }],
      },
    })

    if (employee) {
      return reply.status(400).send({
        error:
          'Este usuário já existe, verifique se você digitou o email e o cpf correto!',
      })
    }

    const passwordHash = await bcryptjs.hash(password, 10)

    await prisma.user.create({
      data: {
        name,
        cpf,
        phone,
        address,
        email,
        passwordHash,
        avatarUrl,
        employee: {
          create: {},
        },
      },
      include: {
        employee: true,
      },
    })
  })

  app.put('/employees/:id', async (request, reply) => {
    await request.jwtVerify()

    const paramsSchema = z.object({
      id: z.string().uuid(),
    })

    const { id } = paramsSchema.parse(request.params)

    const bodySchema = z.object({
      name: z.string(),
      phone: z.string(),
      address: z.string(),
    })

    const { name, phone, address } = bodySchema.parse(request.body)

    const employee = await prisma.user.update({
      where: {
        id,
      },
      data: {
        name,
        phone,
        address,
      },
    })

    return employee
  })

  app.delete('/employees/:id', async (request) => {
    await request.jwtVerify()

    const paramsSchema = z.object({
      id: z.string().uuid(),
    })

    const { id } = paramsSchema.parse(request.params)

    await prisma.user.delete({
      where: {
        id,
      },
    })
  })
}
