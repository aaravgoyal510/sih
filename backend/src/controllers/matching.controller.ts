import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { matchingEngine } from '../matching/matching-engine';

export const getMatchesForRequirement = async (req: Request, res: Response): Promise<void> => {
  try {
    const requirementId = req.params.requirementId as string;

    const requirement = await prisma.requirement.findUnique({
      where: { id: requirementId },
    });

    if (!requirement) {
      res.status(404).json({ success: false, error: 'Requirement not found' });
      return;
    }

    const matches = await matchingEngine.matchRequirement(requirement);

    res.status(200).json({
      success: true,
      requirementId: requirement.id,
      resourceType: requirement.resourceType,
      district: requirement.district,
      totalCandidatesEvaluated: matches.length,
      matches,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
