import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase configuration missing');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createClient<any>(url, key);
}

function getAnthropicClient() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
}

interface EvaluationScores {
  impact: number;        // /30
  authenticity: number;  // /25
  quality: number;       // /20
  emotion: number;       // /15
  originality: number;   // /10
  total: number;         // /100
  justification: string;
  feedback: string[];
}

const JUDGING_PROMPT = `Tu es un juge expert des SUTRA Awards, un concours mensuel recompensant les meilleures videos creees sur la plateforme SUTRA by Purama.

Tu dois evaluer chaque video selon 5 criteres stricts avec une notation precise:

1. IMPACT POSITIF (0-30 points):
   - La video apporte-t-elle une valeur reelle au spectateur?
   - Le message est-il constructif, educatif, ou inspirant?
   - Potentiel de changement positif dans la vie du spectateur?

2. AUTHENTICITE (0-25 points):
   - Le ton est-il sincere et credible?
   - Le contenu reflète-t-il une voix unique et personnelle?
   - Evite-t-il le clickbait trompeur ou la manipulation?

3. QUALITE CREATIVE (0-20 points):
   - Structure narrative coherente et engageante?
   - Qualite du script (hook, developpement, conclusion)?
   - Utilisation creative des elements visuels et sonores?

4. ENGAGEMENT EMOTIONNEL (0-15 points):
   - La video provoque-t-elle une reaction emotionnelle?
   - Le spectateur est-il captive du debut a la fin?
   - Le call-to-action est-il naturel et motivant?

5. ORIGINALITE (0-10 points):
   - Le sujet ou l'angle est-il original?
   - Se demarque-t-elle du contenu generique?
   - Apporte-t-elle une perspective nouvelle?

IMPORTANT: Sois juste mais exigeant. Un score de 80+ devrait etre exceptionnel. La moyenne devrait tourner autour de 50-65.

Reponds UNIQUEMENT avec du JSON valide, sans markdown:
{
  "impact": number,
  "authenticity": number,
  "quality": number,
  "emotion": number,
  "originality": number,
  "total": number,
  "justification": "string (2-3 phrases resumant l'evaluation globale)",
  "feedback": ["string (point positif ou amelioration specifique)"]
}`;

export async function POST(request: NextRequest) {
  try {
    // Authenticate: accept secret key or Vercel Cron auth
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    const isCronAuth = authHeader === `Bearer ${cronSecret}`;
    const isVercelCron = request.headers.get('x-vercel-cron') === '1';

    if (!isCronAuth && !isVercelCron) {
      // Also allow authenticated admin users
      const supabaseCheck = getSupabaseAdmin();
      if (authHeader) {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user } } = await supabaseCheck.auth.getUser(token);
        if (!user) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        // Check if user is admin (optional - you could add an admin check here)
      } else {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const supabase = getSupabaseAdmin();
    const anthropic = getAnthropicClient();

    // Get current month's pending submissions
    const now = new Date();
    const contestMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const { data: submissions, error: fetchError } = await supabase
      .from('contest_submissions')
      .select('id, video_id, category, user_id, video_title')
      .eq('contest_month', contestMonth)
      .eq('status', 'pending');

    if (fetchError) {
      console.error('Fetch submissions error:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch submissions' }, { status: 500 });
    }

    if (!submissions || submissions.length === 0) {
      return NextResponse.json({
        success: true,
        evaluated: 0,
        message: 'Aucune soumission en attente a evaluer.',
      });
    }

    let evaluatedCount = 0;
    const errors: string[] = [];

    for (const submission of submissions) {
      try {
        // Get the video's script/transcript
        const { data: video } = await supabase
          .from('videos')
          .select('title, description, script, format, duration_seconds')
          .eq('id', submission.video_id)
          .single();

        if (!video) {
          errors.push(`Video ${submission.video_id} not found`);
          continue;
        }

        // Build content for evaluation
        const scriptContent = video.script
          ? typeof video.script === 'string'
            ? video.script
            : JSON.stringify(video.script)
          : '';

        const scenes = video.script?.scenes
          ? video.script.scenes.map((s: { index: number; narration: string; visual_description: string }) =>
              `Scene ${s.index + 1}: ${s.narration} [Visuel: ${s.visual_description}]`
            ).join('\n')
          : 'Pas de scenes disponibles';

        const evaluationContent = `
TITRE: ${video.title}
DESCRIPTION: ${video.description || 'N/A'}
FORMAT: ${video.format} (${submission.category === 'youtube' ? 'YouTube horizontal, 3min+' : 'Vertical Short/Reel, 15-60s'})
DUREE: ${video.duration_seconds || 'N/A'} secondes
CATEGORIE: ${submission.category}

SCRIPT/CONTENU:
${video.script?.hook ? `HOOK: ${video.script.hook}` : ''}
${scenes}
${video.script?.cta ? `CTA: ${video.script.cta}` : ''}

${scriptContent && !video.script?.scenes ? `SCRIPT BRUT:\n${scriptContent.substring(0, 3000)}` : ''}
`;

        // Send to Claude for evaluation
        const response = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1024,
          system: JUDGING_PROMPT,
          messages: [
            {
              role: 'user',
              content: `Evalue cette video soumise aux SUTRA Awards:\n${evaluationContent}`,
            },
          ],
        });

        const textBlock = response.content.find((block) => block.type === 'text');
        if (!textBlock || textBlock.type !== 'text') {
          errors.push(`No text response for submission ${submission.id}`);
          continue;
        }

        const cleaned = textBlock.text.replace(/```json\n?|\n?```/g, '').trim();
        const scores: EvaluationScores = JSON.parse(cleaned);

        // Validate scores
        const validatedScores = {
          impact: Math.min(30, Math.max(0, Math.round(scores.impact))),
          authenticity: Math.min(25, Math.max(0, Math.round(scores.authenticity))),
          quality: Math.min(20, Math.max(0, Math.round(scores.quality))),
          emotion: Math.min(15, Math.max(0, Math.round(scores.emotion))),
          originality: Math.min(10, Math.max(0, Math.round(scores.originality))),
        };

        const total =
          validatedScores.impact +
          validatedScores.authenticity +
          validatedScores.quality +
          validatedScores.emotion +
          validatedScores.originality;

        // Update submission with scores
        const { error: updateError } = await supabase
          .from('contest_submissions')
          .update({
            status: 'evaluated',
            score_impact: validatedScores.impact,
            score_authenticity: validatedScores.authenticity,
            score_quality: validatedScores.quality,
            score_emotion: validatedScores.emotion,
            score_originality: validatedScores.originality,
            score_total: total,
            justification: scores.justification,
            feedback: scores.feedback,
            evaluated_at: new Date().toISOString(),
          })
          .eq('id', submission.id);

        if (updateError) {
          errors.push(`Update error for ${submission.id}: ${updateError.message}`);
          continue;
        }

        evaluatedCount++;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        errors.push(`Evaluation error for ${submission.id}: ${errorMessage}`);
      }
    }

    return NextResponse.json({
      success: true,
      evaluated: evaluatedCount,
      total: submissions.length,
      errors: errors.length > 0 ? errors : undefined,
      message: `${evaluatedCount}/${submissions.length} soumissions evaluees.`,
    });
  } catch (error) {
    console.error('Contest evaluate error:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur.' },
      { status: 500 }
    );
  }
}
