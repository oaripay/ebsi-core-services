node {
    stage('Clone repo') {
        checkout scm
    }
    stage('Unit test') {
        environment {
                API_PRIVATE_KEY=credentials('API_AUTHORISATION_PRIVATE_KEY')
        }
        withCredentials([string(credentialsId: 'API_PRIVATE_KEY_AUTHORISATION', variable: 'API_PRIVATE_KEY')]) {
            nodejs(nodeJSInstallationName: '14.15.4') {
                sh 'yarn install --frozen-lockfile'
                sh 'yarn run audit'
                sh 'yarn lint'
                sh 'yarn test:ci'
            }
        }
    }
    ebsi_deploy("clone_repo": false)
}
