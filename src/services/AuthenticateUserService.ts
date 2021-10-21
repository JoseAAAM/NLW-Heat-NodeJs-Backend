import axios from 'axios'
import { sign } from 'jsonwebtoken'

import PrismaCLient from '../prisma'

/**
 * Receber code(string)
 * Recuperar o acess_token no github
 * Recuperar infos do user no github
 * Verificar se o usuario existe no DB
 * ----- Sim = Gera um token
 * ----- Não = Cria no DB, gera um acess_token
 * Retornar o token com as infos do user
 */

interface IAccessTokenResponse {
  access_token: string
}

interface IUserResponse {
  avatar_url: string
  login: string
  id: number
  name: string
}

class AuthenticateUserService {
  async execute(code: string) {
    const url = 'https://github.com/login/oauth/access_token'

    const { data: accessTokeResponse } = await axios.post<IAccessTokenResponse>(
      url,
      null,
      {
        params: {
          client_id: process.env.GITHUB_CLIENT_ID,
          client_secret: process.env.GITHUB_CLIENT_SECRET,
          code
        },
        headers: {
          Accept: 'application/json'
        }
      }
    )
    const response = await axios.get<IUserResponse>(
      'https://api.github.com/user',
      {
        headers: {
          authorization: `Bearer ${accessTokeResponse.access_token}`
        }
      }
    )
    const { login, id, avatar_url, name } = response.data

    let user = await PrismaCLient.user.findFirst({
      where: {
        github_id: id
      }
    })

    if (!user) {
      user = await PrismaCLient.user.create({
        data: {
          github_id: id,
          login,
          avatar_url,
          name
        }
      })
    }

    const token = sign(
      {
        user: {
          name: user.name,
          avatar_url: user.avatar_url,
          id: user.id
        }
      },
      process.env.JWT_SECRET,
      {
        subject: user.id,
        expiresIn: '1d'
      }
    )

    return { token, user }
  }
}

export { AuthenticateUserService }
