import { Op } from 'sequelize';
import User from '../models/User';
import Meetup from '../models/Meetup';
import Subscription from '../models/Subscription';
import SubscriptionMail from '../jobs/SubscriptionMail';
import Queue from '../../lib/Queue';

class SubscriptionController {
  async index(req, res) {
    const subscriptions = await Subscription.findAll({
      where: {
        user_id: req.userId,
      },
      attributes: ['meetup_id'],
      include: [
        {
          model: Meetup,
          as: 'meetup',
          where: {
            date: {
              [Op.gt]: new Date(),
            },
          },
          attributes: ['title', 'description', 'location', 'date'],
          required: true,
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['name', 'email'],
              include: [
                {
                  model: 'File',
                  as: 'avatar',
                  attributes: ['path', 'url'],
                },
              ],
            },
          ],
        },
      ],
      order: [['meetup', 'date']],
    });

    return res.json(subscriptions);
  }

  async store(req, res) {
    const user_id = req.userId;
    const user = await User.findByPk(user_id);
    const meetup = await Meetup.findByPk(req.body.meetup_id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['name', 'email'],
        },
      ],
    });

    if (!meetup) {
      return res.status(404).json({ error: 'Meetup not found' });
    }

    if (meetup.user_id === user_id) {
      return res
        .status(400)
        .json({ error: 'You can´t subscribe in your own meetups' });
    }

    if (meetup.past) {
      return res
        .status(400)
        .json({ error: 'You cant subscribe in past meetups' });
    }

    const subscriptionExist = await Subscription.findOne({
      where: {
        meetup_id: req.body.meetup_id,
        user_id,
      },
    });

    if (subscriptionExist) {
      return res.status(400).json({ error: 'You already subscribe' });
    }

    const subscriberOnSameHour = await Subscription.findOne({
      where: {
        user_id,
      },
      include: [
        {
          model: Meetup,
          as: 'meetup',
          required: true,
          where: {
            date: meetup.date,
          },
        },
      ],
    });

    if (subscriberOnSameHour) {
      return res
        .status(400)
        .json({ error: "You can't subscribe to two meetups at the same time" });
    }

    await Subscription.create({
      meetup_id: req.body.meetup_id,
      user_id,
    });

    // Send subscription email
    await Queue.add(SubscriptionMail.key, { meetup, user });

    return res.json({
      meetup_id: req.body.meetup_id,
      date: meetup.date,
    });
  }
}

export default new SubscriptionController();
