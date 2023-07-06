import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-42';
import { AuthService } from '../auth.service';
import { OauthData } from '../interfaces';

interface Profile42 {
    id: string;
    displayName: string;
    name: { familyName: string; givenName: string };
    emails: Array<{ value: string; verified: boolean }>;
    photos: Array<{ value: string }>;
    provider: string;
    _raw: string;
    _json: {
        sub: string;
        name: string;
        given_name: string;
        family_name: string;
        picture: string;
        email: string;
        email_verified: boolean;
        locale: string;
    };
}

@Injectable()
export class Strategy42 extends PassportStrategy(Strategy, '42') {
    constructor(private authService: AuthService) {
        super({
            clientID: process.env.API42_CLIENT_ID,
            clientSecret: process.env.API42_CLIENT_SECRET,
            callbackURL: process.env.BACKEND_URL + '/auth/42/callback',
        });
    }

    async validate(
        accessToken: string,
        refreshToken: string,
        profile: Profile42,
        done: VerifyCallback,
    ): Promise<any> {
        const { id, emails, name, photos } = profile;
        // generate a username based on the 42 profile, will only be used if the user doesn't have a username yet
        const generatedUsername = `42-${name.givenName}-${name.familyName}`;

        // transform the 42 profile into our OauthData interface
        const data: OauthData = {
            id,
            email: emails[0].value,
            username: generatedUsername,
            profile: {
                firstName: name.givenName,
                lastName: name.familyName,
                avatar: photos[0].value,
            },
            from: '42',
        };
        const user = await this.authService.createOrFindUserWithOauthData(data);
        done(null, user);
    }
}
