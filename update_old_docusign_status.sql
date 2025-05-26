-- Actualizar estados antiguos de DocuSign a los nuevos estados
-- Este script convierte los estados anteriores a los nuevos estados en español

UPDATE public.applications 
SET docusign_manual_status = CASE 
  WHEN docusign_manual_status = 'Sent' THEN 'ENVIADO'
  WHEN docusign_manual_status = 'Delivered' THEN 'ENVIADO'
  WHEN docusign_manual_status = 'Completed' THEN 'FIRMADO'
  WHEN docusign_manual_status = 'Voided' THEN 'CANCELADO'
  WHEN docusign_manual_status = 'Declined' THEN 'CANCELADO'
  ELSE 'PENDIENTE DE ENVIO'
END
WHERE docusign_manual_status IS NOT NULL;

-- Verificar los cambios
SELECT docusign_envelope_id, docusign_manual_status, client_name 
FROM public.applications 
WHERE docusign_envelope_id IS NOT NULL; 