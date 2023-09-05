import { NextFunction, Request, Response } from 'express';
import db from '../../database';
import user from '../../user';
import helpers from '../helpers';
import accountHelpers from './helpers';
import pagination from '../../pagination';
import { UserObjectFull } from '../../types/user';

interface Locals extends Request {
    uid: number,
    sessionID: number
}

interface BreadCrumbsType {
    text: string,
    url: string
}

interface CustomUser extends UserObjectFull {
    uid: number,
    usernames?: unknown,
    history?: unknown,
    sessions?: unknown,
    title: string,
    emails?: unknown,
    moderationNotes?: unknown,
    pagination: number,
    breadcrumbs: BreadCrumbsType
}

export async function getNotes(userData: UserObjectFull, start: number, stop: number) {
    if (!userData.isAdminOrGlobalModeratorOrModerator) {
        return;
    }
    // eslint-disable-next-line max-len
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
    const [notes, count] = await Promise.all([
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        user.getModerationNotes(userData.uid, start, stop),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        db.sortedSetCard(`uid:${userData.uid}:moderation:notes`),
    ]);
    // line 50's source file has the types in db. therefore have disabled
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    return { notes: notes, count: count };
}

export default async function get(req: Locals, res: Response, next: NextFunction) {
    // eslint-disable-next-line max-len
    const userData:CustomUser = await accountHelpers.getUserDataByUserSlug(req.params.userslug, req.uid, req.query) as CustomUser;
    if (!userData) {
        return next();
    }
    const page:number = Math.max(1, req.query.page as unknown as number || 1);
    const itemsPerPage = 10;
    const start:number = (page - 1) * itemsPerPage;
    const stop:number = start + itemsPerPage - 1;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const [history, sessions, usernames, emails, notes] = await Promise.all([
        // eslint-disable-next-line max-len
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        user.getModerationHistory(userData.uid) as UserObjectFull,
        // eslint-disable-next-line max-len
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        user.auth.getSessions(userData.uid, req.sessionID),
        // eslint-disable-next-line max-len
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/restrict-template-expressions
        user.getHistory(`user:${userData.uid}:usernames`),
        // eslint-disable-next-line max-len
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/restrict-template-expressions
        user.getHistory(`user:${userData.uid}:emails`),
        getNotes(userData, start, stop),
    ]);

    userData.history = history;
    userData.sessions = sessions;
    userData.usernames = usernames;
    userData.emails = emails;

    if (userData.isAdminOrGlobalModeratorOrModerator) {
        userData.moderationNotes = notes.notes;
        const pageCount = Math.ceil(notes.count / itemsPerPage);
        userData.pagination = pagination.create(page, pageCount, req.query);
    }
    userData.title = '[[pages:account/info]]';
    userData.breadcrumbs = helpers.buildBreadcrumbs([{ text: userData.username, url: `/user/${userData.userslug}` }, { text: '[[user:account_info]]' }]);

    res.render('account/info', userData);
}


